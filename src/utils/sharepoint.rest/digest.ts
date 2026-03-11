import { normalizeGuid } from "../../helpers/strings";
import { isNullOrEmptyString } from "../../helpers/typecheckers";
import { IContextWebInformation } from "../../types/sharepoint.types";
import { GetJsonSync, GetJson } from "../rest";
import { hasGlobalContext, GetRestBaseUrl } from "./common";
import { GetSiteIdSync, GetSiteId } from "./web";

export function getFormDigest(serverRelativeWebUrl?: string, async?: true): Promise<string | null>
export function getFormDigest(serverRelativeWebUrl?: string, async?: false): string | null
export function getFormDigest(serverRelativeWebUrl?: string, async: boolean = false): string | null | Promise<string | null> {
    if (async) {
        return GetContextWebInformation(serverRelativeWebUrl).then(contextWebInformation => {
            return contextWebInformation && contextWebInformation.FormDigestValue || null;
        });
    } else {
        let contextWebInformation = GetContextWebInformationSync(serverRelativeWebUrl);
        return contextWebInformation && contextWebInformation.FormDigestValue || null;
    }
}

export function GetContextWebInformationSync(siteUrl: string): IContextWebInformation {
    var siteId: string = null;
    if (hasGlobalContext() && _spPageContextInfo && _spPageContextInfo.isAppWeb) {
        //inside an app web you can't get the contextinfo for any other site
        siteUrl = _spPageContextInfo.webServerRelativeUrl;
        siteId = _spPageContextInfo.siteId;
    } else {
        siteId = GetSiteIdSync(siteUrl);

        if (isNullOrEmptyString(siteId)) {
            return null;
        }
    }

    let result = GetJsonSync<{ d: { GetContextWebInformation: IContextWebInformation; }; }>(`${GetRestBaseUrl(siteUrl)}/contextinfo`, null, {
        method: "POST",
        maxAge: 5 * 60,
        includeDigestInPost: false,
        allowCache: true,
        postCacheKey: `GetContextWebInformation_${normalizeGuid(siteId)}`,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });

    if (result && result.success) {
        return result.result.d.GetContextWebInformation;
    } else {
        return null;
    }
}

export async function GetContextWebInformation(siteUrl: string): Promise<IContextWebInformation> {
    var siteId: string = null;
    if (hasGlobalContext() && _spPageContextInfo && _spPageContextInfo.isAppWeb) {
        //inside an app web you can't get the contextinfo for any other site
        siteUrl = _spPageContextInfo.webServerRelativeUrl;
        siteId = _spPageContextInfo.siteId;
    } else {
        siteId = await GetSiteId(siteUrl);

        if (isNullOrEmptyString(siteId)) {
            return null;
        }
    }

    try {
        let result = await GetJson<{
            d: { GetContextWebInformation: IContextWebInformation; };
        }>(`${GetRestBaseUrl(siteUrl)}/contextinfo`, null, {
            method: "POST",
            maxAge: 5 * 60,
            includeDigestInPost: false,
            allowCache: true,
            postCacheKey: `GetContextWebInformation_${normalizeGuid(siteId)}`,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        return result.d.GetContextWebInformation;
    } catch {
        return null;
    }
}
