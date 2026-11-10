import { CommonConfig } from "../../../common-config";
import { CommonLogger } from "../../../common-logger";
import { HTMLDecode } from "../../../helpers/browser";
import { chunkArray, firstIndexOf, firstOrNull, makeUniqueArray, toHash } from "../../../helpers/collections.base";
import { promiseNParallel } from "../../../helpers/promises";
import { EnsureViewFields, GetOrderByFromCaml, RemoveOrderByFromCaml, getFieldOutputType } from "../../../helpers/sharepoint";
import { isDate, isNotEmptyArray, isNullOrEmptyArray, isNullOrEmptyString, isNullOrNaN, isNullOrUndefined, isNumeric } from "../../../helpers/typecheckers";
import { encodeURIComponentEX } from "../../../helpers/url";
import { IDictionary } from "../../../types/common.types";
import { jsonTypes } from "../../../types/rest.types";
import { IFieldInfoEX } from "../../../types/sharepoint.types";
import { GeListItemsFoldersBehaviour, IRestItem } from "../../../types/sharepoint.utils.types";
import { GetJson } from "../../rest";
import { EncodeFieldValuesAsTextKey, GetFieldNameFromRawValues, GetSiteUrl, __getSPRestErrorData } from "../common";
import { GetListFields, GetListRestUrl } from "../list";
import { SPServerLocalTimeToUTCSync } from "../web";
import { GetItemsById } from "./GetListItemsById";
import { SkipFields, __fixGetListItemsResults } from "./common";

interface IRenderedItemsOptions {
    columns: string[];
    rowLimit?: number;
    foldersBehaviour?: GeListItemsFoldersBehaviour;
    FolderServerRelativeUrl?: string;
    refreshCache?: boolean;
    /** Throw an unhandled SharePoint threshold error. */
    throwOnUnhandledThreshold?: boolean;
}

const logger = new CommonLogger("utils/sharepoint.rest/listutils/GetListItemsByRenderListDataAsStream");
const lookupOrUserFieldLimit = 11;

/**
 * Retrieves a CAML view using RenderListDataAsStream and maps supported fields to
 * the GetListItemsByCaml REST item shape. This is a separate retrieval path; it does
 * not guarantee that every SharePoint field type can be mapped or that SharePoint
 * will accept every view without throttling.
 *
 * Lookup/person columns may require multiple rendered requests. Append-only notes
 * and RelatedItems need additional CAML requests because rendered rows expose only
 * display text for those fields. Those requests can also fail or be throttled.
 * The requested row limit is respected; otherwise retrieval is capped at 99,999.
 * Task hierarchy views may include parent items that GetItems does not return.
 */
export async function GetListItemsByRenderListDataAsStream(siteUrl: string, listIdOrTitle: string, camlQuery: string, options: IRenderedItemsOptions): Promise<IRestItem[]> {
    siteUrl = GetSiteUrl(siteUrl);

    if (!camlQuery.toLowerCase().startsWith("<view")) {
        camlQuery = `<View Scope='RecursiveAll'><Query>${camlQuery}</Query></View>`;
    }

    let xmlParser = new DOMParser();
    let xmlDoc = xmlParser.parseFromString(camlQuery, "text/xml");
    let viewNode = xmlDoc.querySelector("View, view");
    let queryNode = viewNode && viewNode.querySelector("Query, query");
    let rowLimitNode = viewNode && viewNode.querySelector("RowLimit, rowlimit");
    let viewFieldsNode = viewNode && viewNode.querySelector("ViewFields, viewfields");

    let parseRowLimitNodeResult = _parseRowLimitNode(rowLimitNode, viewNode, options.rowLimit);
    if (!isNullOrUndefined(parseRowLimitNodeResult)) {
        options.rowLimit = parseRowLimitNodeResult.rowLimit;
        camlQuery = parseRowLimitNodeResult.camlQuery;
    }

    let removeSingleAndConditionsResult = _removeSingleAndConditions(viewNode, queryNode);
    if (!isNullOrUndefined(removeSingleAndConditionsResult)) {
        camlQuery = removeSingleAndConditionsResult.camlQuery;
    }

    let getAllItems = isNullOrEmptyString(options.rowLimit) || options.rowLimit < 1;
    let totalItemsInList = 99999;

    let maxBatchSize = 5000;
    let batchSize = options.rowLimit > 0 && options.rowLimit < maxBatchSize ? options.rowLimit : maxBatchSize;
    let totalNumberOfItemsToGet = getAllItems ? totalItemsInList : options.rowLimit > maxBatchSize ? options.rowLimit : batchSize;

    let requestUrl = `${GetListRestUrl(siteUrl, listIdOrTitle)}/GetItems?$expand=FieldValuesAsText`;

    let allListFieldsHash = toHash(await GetListFields(siteUrl, listIdOrTitle), f => f.InternalName);

    let orderByStatement = GetOrderByFromCaml(camlQuery);

    if (isNullOrUndefined(options.columns)) {
        options.columns = [];
    }

    let columns = options.columns;
    columns = _ensureOrderByColumns(orderByStatement, columns);
    columns = _ensureViewFields(viewFieldsNode, columns, allListFieldsHash);
    columns = _normalizeColumns(columns, allListFieldsHash);

    if (columns.length > options.columns.length) {
        logger.warn(`added ${columns.length - options.columns.length} to query`);
    }

    options.columns = columns;

    let lookupOrUserFieldsInColumns = options.columns.filter((columnName) => {
        let field = allListFieldsHash[columnName];
        return _isLookupOrUserField(field);
    });

    let requiresLookupBatching = lookupOrUserFieldsInColumns.length >= lookupOrUserFieldLimit;

    try {
        const { items, needContentTypes, postProcessOrderBy } = await _getItemsByRenderedView(siteUrl, listIdOrTitle, camlQuery, options, totalNumberOfItemsToGet, allListFieldsHash, requiresLookupBatching, orderByStatement);

        let itemsResult = __fixGetListItemsResults(siteUrl, listIdOrTitle, items, options.foldersBehaviour);

        let itemsWithOutContentType: number[] = [];
        if (needContentTypes) {
            itemsResult.forEach((item) => {
                if (isNullOrUndefined(item["ContentType"])) {
                    itemsWithOutContentType.push(item.Id);
                } else if (!isNullOrUndefined(item["ContentType"].Name)) {
                    item["ContentType"] = item["ContentType"].Name;
                }
            });
        }

        if (itemsWithOutContentType.length > 0) {
            logger.time("Getting content types");
            //Issue 1465 content types no longer come back from get items request...
            //Make a separate request to get this info
            let ctypes = (await GetItemsById(siteUrl, listIdOrTitle, itemsWithOutContentType, {
                expand: ['ContentType/Name'],
                select: ['ContentType/Name', 'Id'],
                jsonMetadata: jsonTypes.nometadata
            })) as any as { Id: string, ContentType: { Name: string } }[];

            itemsResult.forEach(item => {
                if (!isNullOrUndefined(ctypes[item.Id])) {
                    item["ContentType"] = ctypes[item.Id].ContentType.Name
                }
            });
            logger.timeEnd("Getting content types");
        }

        if (postProcessOrderBy) {
            //re-apply sort
            if (CommonConfig.i.IsLocalDev) {
                logger.table(itemsResult.map(i => {
                    let row = {
                        Id: i.Id,
                        Title: i.Title
                    };
                    orderByStatement.forEach(s => { row[`${s.Name} ${s.IsAscending ? 'asc' : 'desc'}`] = i[s.Name]; });
                    return row;
                }), "before sort", true);
            }
            itemsResult.sort((a, b) => {
                for (let i = 0; i < orderByStatement.length; i++) {
                    let ob = orderByStatement[i];
                    let v1 = a[ob.Name];
                    let v2 = b[ob.Name];
                    if (v1 === v2) {
                        //these are equal - continue to second sort statement
                    }
                    else {
                        if (ob.IsAscending)
                            return (v1 > v2) ? 1 : -1;
                        else
                            return (v2 > v1) ? 1 : -1;
                    }
                }
                return 0;
            });

            if (CommonConfig.i.IsLocalDev) {
                logger.table(itemsResult.map(i => {
                    let row = {
                        Id: i.Id,
                        Title: i.Title
                    };
                    orderByStatement.forEach(s => { row[`${s.Name} ${s.IsAscending ? 'asc' : 'desc'}`] = i[s.Name]; });
                    return row;
                }), "after sort", true);
            }

        }

        return itemsResult;
    } catch (ex) {
        if (options.throwOnUnhandledThreshold && __getSPRestErrorData(ex).code.includes("SPQueryThrottledException")) throw ex;
        logger.error(ex);
    }

    return null;
}

interface ICamlRequestResult {
    items: IRestItem[];
    postProcessOrderBy: boolean;
    needContentTypes: boolean;
}

interface IRenderedReference {
    id?: string | number;
    title?: string;
    lookupId?: number;
    lookupValue?: string;
}

/**
 * Map supported rendered fields to the standard REST item shape. Unsupported or
 * incomplete values fail rather than silently returning an incorrect REST value.
 * Taxonomy WssId is unavailable in rendered data and is represented as -1.
 */
function _mapRenderedRowToRestItem(row: Record<string, unknown>, fields: IFieldInfoEX[]): IRestItem {
    const id = Number(row.ID);
    const objectType = Number(row.FSObjType);

    if (!Number.isSafeInteger(id) || id < 1 || ![0, 1].includes(objectType) || typeof row.FileRef !== "string") {
        throw new Error("RenderListDataAsStream returned an invalid ID, file reference or object type.");
    }

    const path = row.FileRef;
    const lastSlash = path.lastIndexOf("/");
    const item: IRestItem = {
        Id: id,
        ID: id,
        FileRef: path,
        FileDirRef: path.slice(0, lastSlash),
        FileLeafRef: path.slice(lastSlash + 1),
        FileType: "",
        FileSystemObjectType: objectType,
        __DisplayTitle: "",
        Title: typeof row.Title === "string" ? HTMLDecode(row.Title) : row.Title ?? null,
        FieldValuesAsText: { FileRef: path, FileDirRef: path.slice(0, lastSlash) }
    };

    for (const field of fields) {
        const name = field.InternalName;
        if (name.toLowerCase() === "id") continue;
        if (name === "FileRef" || name === "FileDirRef" || name === "FileLeafRef" || name === "FileSystemObjectType") continue;
        if (name === "ContentType" || name === "ContentTypeId") continue;
        if (name === "DocIcon" && !Object.prototype.hasOwnProperty.call(row, name)) {
            item.DocIcon = null;
            continue;
        }

        if (!Object.prototype.hasOwnProperty.call(row, name)) throw new Error(`Rendered row ${id} is missing field ${name}.`);
        const value = row[name];
        const type = getFieldOutputType(field);

        if (type === "Note" && /\bAppendOnly\s*=\s*["\x27]TRUE["\x27]/i.test(field.SchemaXml || "")) {
            throw new Error(`Mapping append-only field ${name} is not yet supported.`);
        }

        const key = GetFieldNameFromRawValues(field);
        const textKey = EncodeFieldValuesAsTextKey(name);

        if (field.TypeAsString === "Calculated" && typeof row[`${name}.calculated`] === "string") {
            const calculated = row[`${name}.calculated`] as string;
            item[key] = calculated.includes(";#") ? calculated.slice(calculated.indexOf(";#") + 2) : calculated;
            if (type === "Boolean") item.FieldValuesAsText[textKey] = String(value ?? "");
        } else if (type === "TaxonomyFieldTypeMulti") {
            if (value === "" || value === null) {
                item[key] = [];
            } else if (Array.isArray(value)) {
                item[key] = value.map((term: unknown) => {
                    if (!term || typeof term !== "object" || !("Label" in term) || typeof term.Label !== "string" ||
                        !("TermID" in term) || typeof term.TermID !== "string") {
                        throw new Error(`Invalid rendered managed metadata value in field ${name}.`);
                    }
                    return { Label: term.Label, TermGuid: term.TermID, WssId: -1 };
                });
            } else {
                throw new Error(`Invalid rendered managed metadata field ${name}.`);
            }
        } else if (["Lookup", "LookupMulti", "User", "UserMulti"].includes(type)) {
            if (value !== "" && value !== null && !Array.isArray(value)) throw new Error(`Invalid rendered reference field ${name}.`);
            const references = (Array.isArray(value) ? value : []) as IRenderedReference[];
            const ids = references.map(ref => Number(type.startsWith("User") ? ref.id : ref.lookupId));
            if (ids.some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error(`Invalid reference ID in field ${name}.`);
            const multiple = type.endsWith("Multi");
            item[key] = multiple ? (value === "" || value === null ? null : ids) : (ids[0] ?? null);
            item.FieldValuesAsText[textKey] = references.map(ref => type.startsWith("User") ? ref.title : ref.lookupValue).join("; ");
        } else if (["Number", "Currency", "Integer", "Counter"].includes(type)) {
            const raw = row[`${name}.`];
            if (raw !== "" && raw !== null && raw !== undefined && !Number.isFinite(Number(raw))) throw new Error(`Invalid rendered number in field ${name}.`);
            if (raw === undefined && value !== "" && value !== null) throw new Error(`Rendered number field ${name} has no raw value.`);
            item[key] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
        } else if (type === "DateTime") {
            const raw = row[`${name}.`];
            if (raw === undefined && value !== "" && value !== null) throw new Error(`Rendered date field ${name} has no UTC value.`);
            item[key] = raw === "" || raw === null || raw === undefined ? null : raw;
        } else if (type === "Boolean" || type === "Attachments") {
            const raw = type === "Attachments" ? value : row[`${name}.value`];
            if (raw !== "" && raw !== null && raw !== undefined && !["0", "1", 0, 1, false, true].includes(raw as string | number | boolean)) throw new Error(`Invalid rendered boolean in field ${name}.`);
            item[key] = raw === "" || raw === null || raw === undefined ? null : raw === "1" || raw === 1 || raw === true;
            item.FieldValuesAsText[textKey] = type === "Attachments" ? (item[key] ? "True" : "False") : String(value ?? "");
        } else if (type === "URL") {
            item[key] = value === "" || value === null ? null : { Url: value, Description: row[`${name}.desc`] || "" };
        } else if (type === "TaxonomyFieldType") {
            if (value === "" || value === null) {
                item[key] = null;
            } else {
                if (typeof value !== "object" || Array.isArray(value) ||
                    !("Label" in value) || typeof value.Label !== "string" ||
                    !("TermID" in value) || typeof value.TermID !== "string") {
                    throw new Error(`Invalid rendered managed metadata field ${name}.`);
                }
                // The rendered API does not provide WssId. AppsWeb uses -1 for unresolved terms.
                item[key] = { Label: value.Label, TermGuid: value.TermID, WssId: -1 };
            }
        } else if (String(field.TypeAsString) === "Guid") {
            item[key] = typeof value === "string" && value ? value.replace(/[{}]/g, "").toLowerCase() : null;
        } else if (String(type) === "RelatedItems") {
            if (value !== "" && value !== null) {
                throw new Error(`Mapping populated RelatedItems field ${name} is not yet supported. Rendered value: ${JSON.stringify(value)}`);
            }
            item[key] = null;
        } else if (type === "Text" && typeof value === "string") {
            item[key] = value === "" ? null : HTMLDecode(value);
        } else if (type === "Note" && typeof value === "string" && !/\bRichText\s*=\s*["\x27]TRUE["\x27]/i.test(field.SchemaXml || "")) {
            // Rendered plain-text notes use HTML line breaks and escaped characters.
            item[key] = value === "" ? null : HTMLDecode(value.replace(/<br\s*\/?\s*>/gi, "\n"));
        } else if (["Text", "Note", "Choice", "MultiChoice"].includes(type)) {
            item[key] = value === "" || value === undefined ? null : value;
        } else {
            throw new Error(`Mapping rendered field ${name} of type ${type} is not yet supported.`);
        }
    }

    if (row.ContentType !== undefined) item.ContentType = { Name: row.ContentType };
    if (row.ContentTypeId !== undefined) item.ContentTypeId = row.ContentTypeId;
    return item;
}

/** Retrieve rendered field batches and merge them in view order. */
async function _getItemsByRenderedView(
    siteUrl: string, listIdOrTitle: string, camlQuery: string, options: IRenderedItemsOptions, totalLimit: number,
    fields: IDictionary<IFieldInfoEX>, requiresLookupBatching: boolean,
    orderBy: { Name: string; IsAscending: boolean }[]
): Promise<ICamlRequestResult> {
    const started = Date.now();

    // Rendered append-only notes contain a "View Entries" link, while RelatedItems
    // contains a count such as "2 related items". Neither contains the REST value.
    // Exclude both here and fetch their actual values together after mapping rows.
    const detailFields = options.columns.map(name => fields[name]).filter(field => field &&
        ((field.TypeAsString === "Note" && /\bAppendOnly\s*=\s*["\x27]TRUE["\x27]/i.test(field.SchemaXml || "")) ||
            String(field.TypeAsString) === "RelatedItems"));
    const detailFieldNames = new Set(detailFields.map(field => field.InternalName));
    const batches = requiresLookupBatching ? _getLookupFieldBatches(orderBy, fields, options.columns) : [options.columns];
    let items: IRestItem[] = null;

    logger.debug(`_getItemsByRenderedView -> Detail fields requiring CAML: ${detailFields.map(field => field.InternalName).join(", ") || "none"}.`);
    logger.debug(`_getItemsByRenderedView -> Retrieving ${batches.length} field batch(es) using RenderListDataAsStream.`);

    for (let index = 0; index < batches.length; index++) {
        const batchStarted = Date.now();
        const columns = batches[index].filter(name => !detailFieldNames.has(name));
        const selectedFields = columns.map(name => fields[name]).filter(field => !!field);

        const rows = await _getRenderedRows(siteUrl, listIdOrTitle, camlQuery, {
            columns,
            rowLimit: totalLimit,
            FolderServerRelativeUrl: options.FolderServerRelativeUrl,
            refreshCache: options.refreshCache
        });

        const mapped = rows.map(row => _mapRenderedRowToRestItem(row, selectedFields));
        logger.debug(`_getItemsByRenderedView -> Batch ${index + 1}/${batches.length} returned ${mapped.length} items in ${Date.now() - batchStarted} ms.`);

        if (items === null) {
            items = mapped;
        } else {
            const byId = new Map(mapped.map(item => [item.Id, item]));

            if (byId.size !== items.length || items.some(item => !byId.has(item.Id))) {
                throw new Error("_getItemsByRenderedView -> Rendered field batches returned different item IDs.");
            }

            items = items.map(item => {
                const other = byId.get(item.Id);
                return {
                    ...item,
                    ...other,
                    FieldValuesAsText: { ...item.FieldValuesAsText, ...other.FieldValuesAsText }
                };
            });
        }
    }

    if (detailFields.length && items.length) {
        await _getDetailedFieldValues(siteUrl, listIdOrTitle, items, detailFields, fields, options);
    }

    logger.debug(`_getItemsByRenderedView -> Retrieved ${items.length} items in ${Date.now() - started} ms.`);

    return {
        items,
        postProcessOrderBy: false,
        needContentTypes: options.columns.some(name => /^contenttype(id)?$/i.test(name))
    };
}

/**
 * Fetch append-only notes and RelatedItems together using the IDs already returned
 * by the rendered view, then merge their REST values into the mapped items. The
 * ID-based CAML requests are batched to 500 IDs and run with limited concurrency.
 * A missing item/field or a failed request is an error: returning rendered display
 * text in place of the underlying value would break the REST item contract.
 */
async function _getDetailedFieldValues(
    siteUrl: string, listIdOrTitle: string, items: IRestItem[], detailFields: IFieldInfoEX[],
    fields: IDictionary<IFieldInfoEX>, options: IRenderedItemsOptions
): Promise<void> {
    const started = Date.now();
    const batches = chunkArray(items.map(item => item.Id), 500);
    const columns = ["ID", ...detailFields.map(field => field.InternalName)];
    const requestUrl = `${GetListRestUrl(siteUrl, listIdOrTitle)}/GetItems?$expand=FieldValuesAsText`;

    logger.debug(`_getDetailedFieldValues -> Retrieving ${detailFields.length} field(s) for ${items.length} items in ${batches.length} ID batch(es).`);

    const results = await promiseNParallel(batches.map((ids, index) => async () => {
        const batchStarted = Date.now();
        const values = ids.map(id => `<Value Type="Counter">${id}</Value>`).join("");
        const query = `<View Scope="RecursiveAll"><Query><Where><In><FieldRef Name="ID"/><Values>${values}</Values></In></Where></Query></View>`;
        const result = await _processNormalCamlRequest([], fields, { ...options, columns }, query, requestUrl, [], siteUrl, ids.length, ids.length);
        logger.debug(`_getDetailedFieldValues -> Batch ${index + 1}/${batches.length} returned ${result.items.length}/${ids.length} items in ${Date.now() - batchStarted} ms.`);
        return result;
    }), 4);

    const details = new Map<number, IRestItem>();
    results.forEach(result => result.items.forEach(item => details.set(item.Id, item)));

    for (const item of items) {
        const detail = details.get(item.Id);
        if (!detail) throw new Error(`_getDetailedFieldValues -> Missing field values for item ${item.Id}.`);

        for (const field of detailFields) {
            const key = GetFieldNameFromRawValues(field);
            if (!Object.prototype.hasOwnProperty.call(detail, key)) {
                throw new Error(`_getDetailedFieldValues -> Missing field ${field.InternalName} for item ${item.Id}.`);
            }
            item[key] = detail[key];
        }
    }

    logger.debug(`_getDetailedFieldValues -> Retrieved field values in ${Date.now() - started} ms.`);
}

/**
 * RenderListDataAsStream can also hit SharePoint's lookup-column threshold. Split
 * lookup/person fields across requests and keep sort fields in each batch so their
 * results can be matched by ID and merged in the first batch's order.
 */
function _getLookupFieldBatches(orderBy: { Name: string; IsAscending: boolean }[], fields: IDictionary<IFieldInfoEX>, columns: string[]): string[][] {
    const orderFields = orderBy.map(order => fields[order.Name]).filter(field => !!field);
    const orderLookupNames = orderFields.filter(_isLookupOrUserField).map(field => field.InternalName);
    const remainingLookups = columns.filter(name => _isLookupOrUserField(fields[name]) && !orderLookupNames.includes(name));
    const capacity = lookupOrUserFieldLimit - orderLookupNames.length;

    if (capacity < 1 && remainingLookups.length) throw new Error("Too many lookup fields are required for sorting.");

    const lookupBatches = remainingLookups.length ? chunkArray(remainingLookups, capacity) : [[]];
    const otherFields = columns.filter(name => fields[name] && !_isLookupOrUserField(fields[name]));
    const otherBatches = otherFields.length ? chunkArray(otherFields, Math.ceil(otherFields.length / lookupBatches.length)) : [];
    return lookupBatches.map((batch, index) => makeUniqueArray([
        ...batch,
        ...orderFields.map(field => field.InternalName),
        ...(otherBatches[index] || [])
    ]));
}

function _ensureViewFields(viewFieldsNode: Element, columns: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    //ISSUE: 1565
    //Cases
    //1. Empty view fields element so ALL columns will be requested. We must include all list fields in 
    //columns parsing so that we get an accurate count of how many lookup/user fields there are
    //2. View fields element with a some field names that must also be included in the column parsing so we add them here.
    if (isNullOrUndefined(viewFieldsNode) && isNullOrEmptyArray(columns)) {
        Object.keys(allListFieldsHash).forEach((fieldName) => {
            let field = allListFieldsHash[fieldName];
            if (!isNullOrUndefined(field)
                && !field.Hidden
                && !SkipFields.includes(fieldName.toLowerCase())) {
                columns.push(field.InternalName);
            }
        });
    } else if (!isNullOrUndefined(viewFieldsNode)) {
        let fieldRefNodes = Array.from(viewFieldsNode.querySelectorAll("FieldRef"));
        if (isNotEmptyArray(fieldRefNodes)) {
            fieldRefNodes.forEach((fieldRefNode) => {
                let name = fieldRefNode.getAttribute("Name") || fieldRefNode.getAttribute("name");
                if (!isNullOrEmptyString(name)) {
                    columns.push(name);
                }
            });
        }
    }

    return columns;
}

function _ensureOrderByColumns(orderByStatement: { Name: string; IsAscending: boolean; }[], columns: string[]) {
    //Issue 548: Ensure that the order by field is in the view fields and columns collection so 
    //that paging works correctly when there is an order by clause    
    if (orderByStatement.length > 0 && !isNullOrEmptyString(orderByStatement[0].Name)) {
        // just add them to columns, and we will add them to view fields below.
        // camlQuery = EnsureViewFields(camlQuery, orderByStatement.orderBy.map(o => o.Name), false);       
        orderByStatement.forEach(o => {
            if (columns.indexOf(o.Name) === -1) {
                columns.push(o.Name);
            }
        });
    }

    return columns;
}

function _normalizeColumns(columns: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    return makeUniqueArray(columns.map((column) => {
        //some columns will come in lower case (from dvp), normalize them so that we can remove duplicates
        let name = Object.keys(allListFieldsHash).filter((fieldName) => {
            return fieldName.toLowerCase() === column.toLowerCase();
        })[0];
        if (!isNullOrEmptyString(name)) {
            let field = allListFieldsHash[name];
            return field;
        }
        return null;
    }).filter((field) => {
        return !isNullOrUndefined(field);
    }).map((field) => {
        return field.InternalName;
    }).concat(['Title', 'Id', 'FileLeafRef', 'FileDirRef', 'FileRef', 'FileSystemObjectType']));
}

function _removeSingleAndConditions(viewNode: Element, queryNode: Element) {
    if (!isNullOrUndefined(viewNode.querySelector("And, and"))) {
        try {
            //Issue 8063: calendar list, will wrongly add a wrapping <and> statement for a single condition
            //will result in error 500
            //ie: <View Scope='RecursiveAll'><Query><Where><And><Eq><FieldRef Name=\"Title\" /><Value Type=\"Text\">Holiday</Value></Eq></And></Where>
            //</Query><RowLimit>5000</RowLimit></View>
            let whereNode = queryNode && queryNode.querySelector("Where, where");

            if (!isNullOrUndefined(whereNode)) {
                let firstCondition = whereNode.firstElementChild;
                if (firstCondition.tagName.toLowerCase() === "and" && firstCondition.children.length < 2) {
                    //this is the bug, <and> tag must have 2 conditions - get rid of it!
                    whereNode.innerHTML = firstCondition.innerHTML;
                    return {
                        camlQuery: viewNode.outerHTML
                    };
                }
            }
        } catch (e) { }
    }

    return null;
}

function _parseRowLimitNode(rowLimitNode: Element, viewNode: Element, rowLimit: number) {
    if (!isNullOrUndefined(rowLimitNode)) {
        let value = rowLimitNode.textContent;
        //if not provided by options - use it
        if (isNullOrNaN(rowLimit) && isNumeric(value) && Number(value) > 0) {
            rowLimit = Number(value);
        }
        //remove it
        viewNode.removeChild(rowLimitNode);
        return {
            camlQuery: viewNode.outerHTML,
            rowLimit: rowLimit
        };
    }
    return null;
}

function _isLookupOrUserField(field: IFieldInfoEX) {
    if (isNullOrUndefined(field)) {
        return false;
    }
    let outputType = getFieldOutputType(field);

    switch (outputType) {
        case "Lookup":
        case "LookupMulti":
        case "User":
        case "UserMulti":
            return true;
        default:
            return false;
    }
}


async function _processNormalCamlRequest(orderByStatement: { Name: string; IsAscending: boolean; }[],
    allListFieldsHash: IDictionary<IFieldInfoEX>,
    options: IRenderedItemsOptions,
    camlQuery: string,
    requestUrl: string,
    expandFields: string[],
    siteUrl: string,
    totalNumberOfItemsToGet: number,
    batchSize: number) {
    let processColumnsResult = _processColumns(options.columns, expandFields, allListFieldsHash);
    let viewFields = processColumnsResult.viewFields;
    let selectFields = processColumnsResult.selectFields;
    expandFields = processColumnsResult.expandFields;
    let needContentTypes = processColumnsResult.needContentTypes;

    if (isNotEmptyArray(viewFields)) {
        camlQuery = EnsureViewFields(camlQuery, viewFields, true);
    }

    // Prepare the REST URL with select fields
    let restUrlWithSelect = requestUrl;
    if (expandFields.length > 0) {
        restUrlWithSelect += ',' + expandFields.join(',');
    }
    // Include the lookup user select fields with the other select fields
    restUrlWithSelect += '&$select=' + selectFields.join(',');

    // Process the request and get the result
    let result = await processRequestResult(requestUrl, restUrlWithSelect, camlQuery, options, siteUrl, totalNumberOfItemsToGet, batchSize, orderByStatement);

    return {
        ...result,
        needContentTypes
    };
}


function _processColumns(columns: string[], expandFields: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    let thresholdLimitLookupCount = 0;
    let thresholdLimitLookupHit = false;
    let selectFields: string[] = [];
    let viewFields: string[] = [];
    let needContentTypes = false;

    //column parsing
    columns.forEach(viewField => {
        let viewFieldLower = viewField.toLowerCase();
        if (viewFieldLower === 'contenttype' || viewFieldLower === 'contenttypeid') {
            needContentTypes = true;
        } else if (viewFieldLower === '_moderationstatus') {
            selectFields.push(`FieldValuesAsText/${viewField}`);
            viewFields.push('_moderationstatus');
        } else if (viewFieldLower === '_moderationcomments') {
            selectFields.push('OData_' + viewField);
            viewFields.push('_moderationcomments');
        } else if (viewFieldLower === "filesystemobjecttype") {
            selectFields.push("FileSystemObjectType");
        } else if (viewFieldLower === "fileref" || viewFieldLower === "filedirref") {
            //treat them similar to lookup fields
            selectFields.push(viewField);
            selectFields.push(`FieldValuesAsText/${viewField}`);
            viewFields.push(`${viewField}`);
            viewFields.push(`${viewField}Id`);
        } else {
            //prefer to get columns not from FieldValuesAsText, unless special data type requires it (date, lookup, boolean, etc...)
            //make the select url shorter
            let foundField = allListFieldsHash[viewField];
            if (foundField) {
                let foundFieldInternalName = foundField.InternalName;
                viewFields.push(foundFieldInternalName);

                let urlField: IFieldInfoEX = null;

                if (foundField.TypeAsString === "URL" && foundField.InternalName === "URL") {
                    urlField = foundField;
                } else if ((viewFieldLower === "urlnomenu"
                    || viewFieldLower === "urlwmenu2"
                    || viewFieldLower === "urlwmenu")
                    && foundField.TypeAsString === "Computed"
                    && !isNullOrUndefined(allListFieldsHash["URL"])
                    && allListFieldsHash["URL"].TypeAsString === "URL") {
                    urlField = allListFieldsHash["URL"];
                }

                if (!isNullOrUndefined(urlField) && urlField.TypeAsString === "URL") {
                    viewFields.push(urlField.InternalName);
                    selectFields.push(urlField.InternalName);
                    selectFields.push(`FieldValuesAsText/${urlField.InternalName}`);
                } else {
                    //Issue 828, 336
                    if (foundFieldInternalName.startsWith("_")) {
                        foundFieldInternalName = `OData_${foundFieldInternalName}`;
                    }

                    let outputType = getFieldOutputType(foundField);

                    switch (outputType) {
                        case "Lookup":
                        case "LookupMulti":
                        case "User":
                        case "UserMulti":
                            thresholdLimitLookupCount += 1;
                            if (thresholdLimitLookupCount >= lookupOrUserFieldLimit) {
                                thresholdLimitLookupHit = true;
                            }
                            //lookup raw values comes with Id appended
                            selectFields.push(`FieldValuesAsText/${foundFieldInternalName}`);
                            selectFields.push(`${foundFieldInternalName}Id`);
                            break;
                        case "Boolean":
                        case "Attachments":
                        case "AllDayEvent":
                        case "Recurrence":
                            selectFields.push(`FieldValuesAsText/${foundFieldInternalName}`);
                            selectFields.push(foundFieldInternalName);
                            break;
                        default:
                            selectFields.push(foundFieldInternalName);
                            break;
                    }
                }
            }
            else {
                selectFields.push(viewField);
            }
        }
    });

    if (needContentTypes) {
        expandFields.push("ContentType");
        selectFields.push("ContentType/Name");
        selectFields.push("ContentTypeId");
        viewFields.push("ContentTypeId");
    }

    return {
        thresholdLimitLookupHit,
        viewFields: makeUniqueArray(viewFields),
        selectFields: makeUniqueArray(selectFields),
        expandFields: makeUniqueArray(expandFields),
        needContentTypes
    };
}


async function processRequestResult(requestUrl: string, restUrlWithSelect: string, camlQuery: string, options: IRenderedItemsOptions, siteUrl: string, totalNumberOfItemsToGet: number, batchSize: number, orderByStatement): Promise<{ items: IRestItem[]; postProcessOrderBy: boolean; }> {
    //issue 6150: if there are too many fields, url will be too long. just get all columns without adding a $select
    if (restUrlWithSelect.length < 2000)
        requestUrl = restUrlWithSelect;

    let query: any = { ViewXml: camlQuery.replace("</View>", `<RowLimit>${batchSize}</RowLimit></View>`) };

    if (!isNullOrEmptyString(options.FolderServerRelativeUrl))
        query.FolderServerRelativeUrl = options.FolderServerRelativeUrl;

    let data = { query: query };

    let items: IRestItem[] = [];
    //let triedWithoutViewFields = false;
    let postProcessOrderBy = false;
    do {
        let requestResult = await GetJson<{ value: IRestItem[]; }>(requestUrl, JSON.stringify(data),
            {
                allowCache: options.refreshCache !== true,
                postCacheKey: JSON.stringify(data.query),
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl
            });
        if (requestResult && requestResult.value)
            items.push(...requestResult.value);

        let itemsLeftToGet = totalNumberOfItemsToGet - items.length;
        if (itemsLeftToGet > 0 &&//we need more items
            requestResult.value.length === batchSize//we might have more on server since we got the full batch size we asked for
        ) {
            let lastItem = items[items.length - 1];
            let lastItemId = lastItem.Id;
            let pagingInfoSort = "";
            //Issue 7542 need to add order by value to the paging info if it is in the query
            if (!postProcessOrderBy && orderByStatement && orderByStatement.length) {
                let orderFieldName = orderByStatement[0].Name;
                let orderFieldValue = lastItem[orderFieldName];

                //if field is ID - do not do it.
                if (orderFieldName.toLowerCase() !== "id" && !isNullOrUndefined(orderFieldValue)) {
                    //if value is date - we need it in ISO and in this format: yyyyMMdd HH:mm:ss
                    try {
                        //Numbers cast to date properly but they are not dates. ignore number values.
                        let orderFieldValueAsDate = isNumeric(orderFieldValue) ? null : new Date(orderFieldValue);
                        if (isDate(orderFieldValueAsDate)) {
                            try {
                                //issue 7599 date only field on different time zone...
                                orderFieldValue = SPServerLocalTimeToUTCSync(siteUrl, orderFieldValueAsDate).replace(/T/i, " ").replace(/Z/i, " ");
                            } catch (e) { }
                        }

                    } catch (e) { }
                    pagingInfoSort = `&p_${orderFieldName}=${encodeURIComponentEX(orderFieldValue)}`;
                }
            }
            data.query.ListItemCollectionPosition = {
                "PagingInfo": `Paged=TRUE${pagingInfoSort}&p_ID=${lastItemId}`
            };
            if (itemsLeftToGet < batchSize)//the last batch should be smaller, update the row limit
                data.query.ViewXml = camlQuery.replace("</View>", `<RowLimit>${itemsLeftToGet}</RowLimit></View>`);
        }
        else
            data = null;
    } while (!isNullOrEmptyString(data));
    return { items: items, postProcessOrderBy: postProcessOrderBy };
}

interface IRenderedViewOptions {
    refreshCache?: boolean;
    columns: string[];
    /** Maximum items to return. Omit or use 0 to retrieve all pages. */
    rowLimit?: number;
    FolderServerRelativeUrl?: string;
}

interface IRenderedPage {
    Row: Record<string, unknown>[];
    NextHref?: string;
    ListData?: IRenderedPage;
}

/** Retrieve raw view rows with RenderListDataAsStream. */
async function _getRenderedRows(siteUrl: string, listIdOrTitle: string, camlQuery: string, options: IRenderedViewOptions): Promise<Record<string, unknown>[]> {
    siteUrl = GetSiteUrl(siteUrl);

    if (!options || !Array.isArray(options.columns)) throw new Error("columns are required.");

    const wrapped = /^\s*<view\b/i.test(camlQuery) ? camlQuery : `<View Scope="RecursiveAll"><Query>${camlQuery || ""}</Query></View>`;
    const xml = new DOMParser().parseFromString(wrapped, "text/xml");
    const view = xml.documentElement;

    if (view.nodeName.toLowerCase() !== "view" || xml.querySelector("parsererror")) throw new Error("Invalid CAML view.");

    Array.from(view.children).filter(node => ["viewfields", "rowlimit"].includes(node.nodeName.toLowerCase())).forEach(node => view.removeChild(node));

    const viewFields = xml.createElement("ViewFields");
    Array.from(new Set(["ID", "Title", "FileRef", ...options.columns])).forEach(name => {
        const ref = xml.createElement("FieldRef");
        ref.setAttribute("Name", name);
        viewFields.appendChild(ref);
    });
    view.appendChild(viewFields);

    const rowLimit = xml.createElement("RowLimit");
    rowLimit.setAttribute("Paged", "TRUE");
    const maxItems = options.rowLimit;
    const pageSize = maxItems > 0 ? Math.min(maxItems, 5000) : 5000;
    rowLimit.textContent = String(pageSize);
    view.appendChild(rowLimit);

    const viewXml = new XMLSerializer().serializeToString(view);
    const url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/RenderListDataAsStream`;
    const rows: Record<string, unknown>[] = [];
    const seenIds = new Set<number>();
    const seenTokens = new Set<string>();
    let paging: string;
    let pageNumber = 0;

    do {
        pageNumber++;
        const parameters: { ViewXml: string; RenderOptions: number; FolderServerRelativeUrl?: string } = {
            ViewXml: viewXml,
            RenderOptions: 2 // ListData
        };

        if (options.FolderServerRelativeUrl) parameters.FolderServerRelativeUrl = options.FolderServerRelativeUrl;

        const pageStarted = Date.now();
        const response = await GetJson<IRenderedPage>(
            paging ? `${url}?${paging}` : url,
            JSON.stringify({ parameters }),
            {
                allowCache: options.refreshCache !== true,
                postCacheKey: JSON.stringify(parameters),
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl
            }
        );
        const page = response?.ListData || response;

        if (!page || !Array.isArray(page.Row)) throw new Error("Invalid RenderListDataAsStream response.");

        logger.debug(`_getRenderedRows -> Page ${pageNumber} returned ${page.Row.length} rows in ${Date.now() - pageStarted} ms (paging: ${paging ? "continuation" : "first page"}; first ID: ${page.Row[0]?.ID}; last ID: ${page.Row[page.Row.length - 1]?.ID}).`);

        for (let index = 0; index < page.Row.length; index++) {
            const row = page.Row[index];
            const id = Number(row.ID);

            if (!Number.isSafeInteger(id) || id < 1) throw new Error("Rendered view returned an invalid item ID.");

            if (seenIds.has(id)) {
                if (index === 0 && Number(rows[rows.length - 1]?.ID) === id) continue;
                throw new Error(`Rendered view returned duplicate ID ${id}.`);
            }

            rows.push(row);
            seenIds.add(id);

            if (options.rowLimit > 0 && rows.length >= options.rowLimit) break;
        }

        paging = options.rowLimit > 0 && rows.length >= options.rowLimit ? null : page.NextHref?.replace(/&amp;/g, "&").replace(/^\?/, "");
        if (paging && seenTokens.has(paging)) throw new Error("RenderListDataAsStream returned a repeated paging token.");
        if (paging) seenTokens.add(paging);
    } while (paging);

    return rows;
}
