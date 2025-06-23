import { getCacheItem, IRestOptions, setCacheItem } from "../../exports-index";
import { isNullOrEmptyString, isNullOrUndefined, isNumber } from "../../helpers/typecheckers";
import { SPFxAuthToken, SPFxAuthTokenType } from "../../types/auth";
import { GetJson, GetJsonSync } from "../rest";
import { GetRestBaseUrl, hasGlobalContext } from "../sharepoint.rest/common";

export function GetTokenAudiencePrefix(appId: string) {
    return `api://${appId}`;
}
export function GetDefaultScope(appId: string) {
    return `${GetTokenAudiencePrefix(appId)}/access_as_user`;
}
export function GetMSALSiteScope(hostName: string) {
    return `https://${hostName}`;
}

function _getGetSPFxClientAuthTokenParams(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    let acquireURL = `${GetRestBaseUrl(siteUrl)}/SP.OAuth.Token/Acquire`;
    //todo: add all the resource end points (ie. OneNote, Yammer, Stream)
    let resource = "";
    let isSPOToken = false;
    switch (spfxTokenType) {
        case SPFxAuthTokenType.Outlook:
            resource = "https://outlook.office365.com/search";
            break;
        case SPFxAuthTokenType.SharePoint:
        case SPFxAuthTokenType.MySite:
            isSPOToken = true;
            resource = new URL(acquireURL).origin;
            if (spfxTokenType === SPFxAuthTokenType.MySite) {
                let split = resource.split(".");
                split[0] += "-my";
                resource = split.join(".");
            }
            break;
        default:
            resource = "https://graph.microsoft.com";
    }

    let data = {
        resource: resource,
        tokenType: isSPOToken ? "SPO" : undefined
    };

    let params: {
        url: string,
        body: string,
        options: IRestOptions
    } = {
        url: acquireURL,
        body: JSON.stringify(data),
        options: {
            allowCache: false,
            // ...shortLocalCache,
            // postCacheKey: `${spfxTokenType}_${_spPageContextInfo.webId}`,
            includeDigestInPost: true,
            headers: {
                "Accept": "application/json;odata.metadata=minimal",
                "content-type": "application/json; charset=UTF-8",
                "odata-version": "4.0",
            }
        }
    };

    return params;
}

function _parseAndCacheGetSPFxClientAuthTokenResult(result: SPFxAuthToken, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    if (hasGlobalContext() && !isNullOrUndefined(result) && !isNullOrEmptyString(result.access_token)) {
        let expiration = isNumber(result.expires_on) ?
            new Date(result.expires_on * 1000) :
            {
                minutes: 15
            };

        setCacheItem(`access_token_${spfxTokenType}_${_spPageContextInfo.webId}`, result.access_token, expiration);

        return result.access_token;
    }
    return null;
}

function _getSPFxClientAuthTokenFromCache(spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    if (hasGlobalContext()) {
        let cachedToken = getCacheItem<string>(`access_token_${spfxTokenType}_${_spPageContextInfo.webId}`);
        if (!isNullOrEmptyString(cachedToken)) {
            return cachedToken;
        }
    }
    return null;
}

/** Acquire an authorization token for a Outlook, Graph, or SharePoint the same way SPFx clients do */
export async function GetSPFxClientAuthToken(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    try {
        let cachedToken = _getSPFxClientAuthTokenFromCache(spfxTokenType);
        if (!isNullOrEmptyString(cachedToken)) {
            return cachedToken;
        }
        let { url, body, options } = _getGetSPFxClientAuthTokenParams(siteUrl, spfxTokenType);
        let result = await GetJson<SPFxAuthToken>(url, body, options);
        return _parseAndCacheGetSPFxClientAuthTokenResult(result, spfxTokenType);
    } catch {
    }
    return null;
}

/** Acquire an authorization token for a Outlook, Graph, or SharePoint the same way SPFx clients do */
export function GetSPFxClientAuthTokenSync(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    try {
        let cachedToken = _getSPFxClientAuthTokenFromCache(spfxTokenType);
        if (!isNullOrEmptyString(cachedToken)) {
            return cachedToken;
        }
        let { url, body, options } = _getGetSPFxClientAuthTokenParams(siteUrl, spfxTokenType);
        let response = GetJsonSync<SPFxAuthToken>(url, body, options);
        return _parseAndCacheGetSPFxClientAuthTokenResult(response.result, spfxTokenType);
    } catch {
    }
    return null;
}