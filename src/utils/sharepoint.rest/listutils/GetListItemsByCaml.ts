import { CommonLogger } from "../../../common-logger";
import { chunkArray } from "../../../helpers/collections.base";
import { promiseNParallel } from "../../../helpers/promises";
import { GetOrderByFromCaml } from "../../../helpers/sharepoint";
import { GeListItemsFoldersBehaviour, IRestItem } from "../../../types/sharepoint.utils.types";
import { __getSPRestErrorData } from "../common";
import { __fixGetListItemsResults, _getRenderedRows } from "./common";
import { _getListItemsByCaml } from "./GetListItemsByCamlCore";

const logger = new CommonLogger("utils/sharepoint.rest/listutils/GetListItemsByCaml");

/**
 * Try CAML first; on an unhandled list-view threshold, obtain IDs from the rendered
 * view and retrieve complete items through ID-based CAML queries. Rendered views
 * can include task hierarchy parents and SharePoint may throttle either request.
 * Unhandled threshold errors are thrown only when throwOnUnhandledThreshold is set.
 */
export async function GetListItemsByCaml(
    siteUrl: string, listIdOrTitle: string, camlQuery: string, options: Parameters<typeof _getListItemsByCaml>[3]
): Promise<IRestItem[]> {
    const started = Date.now();
    try {
        return await _getListItemsByCaml(siteUrl, listIdOrTitle, camlQuery, {
            ...options, columns: [...(options.columns || [])], throwOnUnhandledThreshold: true
        });
    } catch (error) {
        const errorCode = __getSPRestErrorData(error).code;
        if (!errorCode.includes("SPQueryThrottledException")) throw error;
        if (!errorCode.includes("-2147024860")) {
            if (options.throwOnUnhandledThreshold) throw error;
            return null;
        }
        logger.debug(`GetListItemsByCaml -> CAML hit a threshold after ${Date.now() - started} ms; retrieving rendered IDs.`);
    }

    try {
        const wrapped = /^\s*<view\b/i.test(camlQuery) ? camlQuery : `<View Scope="RecursiveAll"><Query>${camlQuery || ""}</Query></View>`;
        const xml = new DOMParser().parseFromString(wrapped, "text/xml");
        const view = xml.documentElement;
        if (view.nodeName.toLowerCase() !== "view" || xml.querySelector("parsererror")) throw new Error("Invalid CAML view.");

        const rowLimitNode = Array.from(view.children).find(node => node.nodeName.toLowerCase() === "rowlimit");
        const viewLimit = Number(rowLimitNode?.textContent);
        const limit = options.rowLimit == null && viewLimit > 0 ? viewLimit : options.rowLimit;
        const idsStarted = Date.now();
        const rows = await _getRenderedRows(siteUrl, listIdOrTitle, wrapped, {
            columns: [], idsOnly: true, rowLimit: limit > 0 ? limit : 99999,
            FolderServerRelativeUrl: options.FolderServerRelativeUrl, refreshCache: options.refreshCache
        });
        const ids = rows.map(row => Number(row.ID));
        logger.debug(`GetListItemsByCaml -> Retrieved ${ids.length} rendered IDs in ${Date.now() - idsStarted} ms.`);
        if (!ids.length) return [];

        const sortColumns = GetOrderByFromCaml(wrapped).map(field => field.Name);
        Array.from(view.children).filter(node => ["query", "rowlimit"].includes(node.nodeName.toLowerCase())).forEach(node => view.removeChild(node));
        // Stay below 500 values per CAML In clause; batches above 500 failed in SharePoint testing.
        const batches = chunkArray(ids, 499);
        logger.debug(`GetListItemsByCaml -> Retrieved ${ids.length} IDs; requesting ${batches.length} CAML batches.`);
        const results = await promiseNParallel(batches.map((batch, index) => async () => {
            const queryXml = new DOMParser().parseFromString(new XMLSerializer().serializeToString(view), "text/xml");
            const query = queryXml.createElement("Query");
            const where = queryXml.createElement("Where");
            const inNode = queryXml.createElement("In");
            const ref = queryXml.createElement("FieldRef");
            ref.setAttribute("Name", "ID");
            const values = queryXml.createElement("Values");
            batch.forEach(id => {
                const value = queryXml.createElement("Value");
                value.setAttribute("Type", "Counter");
                value.textContent = String(id);
                values.appendChild(value);
            });
            inNode.appendChild(ref);
            inNode.appendChild(values);
            where.appendChild(inNode);
            query.appendChild(where);
            queryXml.documentElement.appendChild(query);
            const batchStarted = Date.now();
            const items = await _getListItemsByCaml(siteUrl, listIdOrTitle, new XMLSerializer().serializeToString(queryXml), {
                ...options, columns: [...new Set([...(options.columns || []), ...sortColumns])],
                rowLimit: batch.length, foldersBehaviour: GeListItemsFoldersBehaviour.ItemsAndFoldersFlat,
                throwOnUnhandledThreshold: true
            });
            if (!items) throw new Error(`CAML ID batch ${index + 1} failed.`);
            logger.debug(`GetListItemsByCaml -> Batch ${index + 1}/${batches.length} returned ${items.length}/${batch.length} items in ${Date.now() - batchStarted} ms.`);
            return items;
        }), 4);

        const byId = new Map<number, IRestItem>();
        for (const item of results.flat()) {
            if (byId.has(item.Id)) throw new Error(`Duplicate CAML item ID ${item.Id}.`);
            byId.set(item.Id, item);
        }
        const ordered = ids.map(id => {
            const item = byId.get(id);
            if (!item) throw new Error(`CAML ID batches did not return item ${id}.`);
            return item;
        });
        logger.debug(`GetListItemsByCaml -> Retrieved ${ordered.length} items in ${Date.now() - started} ms.`);
        return __fixGetListItemsResults(siteUrl, listIdOrTitle, ordered, options.foldersBehaviour);
    } catch (error) {
        logger.error(`GetListItemsByCaml -> Rendered ID fallback failed for list ${listIdOrTitle} after ${Date.now() - started} ms.`);
        if (options.throwOnUnhandledThreshold && __getSPRestErrorData(error).code.includes("SPQueryThrottledException")) throw error;
        logger.error(error);
        return null;
    }
}

