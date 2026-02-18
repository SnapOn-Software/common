import { normalizeGuid } from "../../helpers/strings";
import { isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isValidGuid } from "../../helpers/typecheckers";
import { jsonTypes } from "../../types/rest.types";
import { IWebPartDefinition, WebPartMethods } from "../../types/webpart.types";
import { GetJson } from "../rest";
import { GetRestBaseUrl } from "./common";

const WEBPART_EXPAND = ["WebPart", "WebPart/Properties", "ZoneId"].join(",");

function _getWebPartRestUrl(siteUrl: string, fileServerRelativeUrl: string, options: { id: string, method: WebPartMethods } = { id: null, method: null }) {
    let url = `${GetRestBaseUrl(siteUrl)}/web/getfilebyserverrelativeurl(@u)/getlimitedwebpartmanager(scope=1)/webparts`;

    if (isValidGuid(options.id)) {
        url += `/getbyid('${normalizeGuid(options.id)}')`;

        if (!isNullOrUndefined(options.method)) {
            url += `/${options.method}`;
        }
    }

    url += `?$expand=${WEBPART_EXPAND}&@u='${encodeURIComponent(fileServerRelativeUrl)}'`;

    return url;
}

export async function DeleteWebPart(siteUrl: string, fileServerRelativeUrl: string, webPartId: string) {
    let webPart = GetWebPartById(siteUrl, fileServerRelativeUrl, webPartId);

    if (isNullOrUndefined(webPart)) {
        return true;
    }

    let url = _getWebPartRestUrl(siteUrl, fileServerRelativeUrl, {
        id: webPartId,
        method: WebPartMethods.DeleteWebPart
    });

    try {
        let response = await GetJson<{ "odata.null": boolean; }>(url,
            null,
            {
                method: "POST",
                includeDigestInPost: true,
                allowCache: false,
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });

        return response["odata.null"] === true;
    } catch {
    }

    return false;
}

export async function HideWebPart(siteUrl: string, fileServerRelativeUrl: string, webPartId: string, hidden: boolean) {
    let webPart = await GetWebPartById(siteUrl, fileServerRelativeUrl, webPartId);

    if (isNullOrUndefined(webPart)) {
        return true;
    }

    let url = _getWebPartRestUrl(siteUrl, fileServerRelativeUrl, {
        id: webPartId,
        method: WebPartMethods.SaveWebPartChanges
    });    

    try {
        let response = await GetJson<{ "odata.null": boolean; }>(url,
            JSON.stringify(webPart),
            {
                method: "POST",                
                includeDigestInPost: true,
                allowCache: false,
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });

        return response["odata.null"] === true;
    } catch {
    }

    return false;
}

export async function GetWebParts(siteUrl: string, fileServerRelativeUrl: string) {
    let url = _getWebPartRestUrl(siteUrl, fileServerRelativeUrl);

    let response = await GetJson<{ value: IWebPartDefinition[]; }>(url,
        null,
        {
            allowCache: false,
            jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

    return !isNullOrUndefined(response) && !isNullOrEmptyArray(response.value) ? response.value : [];
}

export async function GetWebPartById(siteUrl: string, fileServerRelativeUrl: string, webPartId: string) {
    let url = _getWebPartRestUrl(siteUrl, fileServerRelativeUrl, { id: webPartId, method: null });

    let response = await GetJson<IWebPartDefinition>(url,
        null,
        {
            allowCache: false,
            jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

    return !isNullOrUndefined(response) && !isNullOrEmptyString(response.Id) ? response : null;
}