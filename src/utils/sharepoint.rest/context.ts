import { CommonLogger } from "../../common-logger";
import { waitForWindowObject } from "../../helpers/browser";
import { firstOrNull } from "../../helpers/collections.base";
import { SPBasePermissions } from "../../helpers/sharepoint";
import { isNotEmptyString, isNullOrEmptyString, isNullOrNaN, isNullOrUndefined, isNumeric, isTypeofFullNameNullOrUndefined, isTypeofFullNameUndefined } from "../../helpers/typecheckers";
import { getQueryStringParameter } from "../../helpers/url";
import { SPBasePermissionKind } from "../../types/sharepoint.types";
import { getCacheItem, setCacheItem } from "../localstoragecache";
import { GetJson, GetJsonSync } from "../rest";
import { longLocalCache } from "../rest.vars";
import { GetListRootFolderSync, GetListSync, GetListViewsSync } from "./list";
import { GetCurrentUserSync } from "./user";
import { GetSiteIdSync, GetWebIdSync } from "./web";

const logger = new CommonLogger("utils/sharepoint/context");

export async function isSharePointOnline() {
    if (isSPOCommonUrl() === true
        || isSPOCachedURL() === true
        || (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true)) {
        return true;
    }

    // Can be an expensive call
    await isSPPageContextInfoReady();

    return getAndCacheIsSharePointOnlineResult();
}

export function isSharePointOnlineSync() {
    if (isSPOCommonUrl() === true
        || isSPOCachedURL() === true
        || (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true)) {
        return true;
    }

    // Can be an expensive call
    isSPPageContextInfoReadySync();

    return getAndCacheIsSharePointOnlineResult();
}

export async function isSPPageContextInfoReady() {
    const contextReady = await waitForWindowObject("_spPageContextInfo", null, 1000);

    if (contextReady !== true) {
        let pageAsJson = await GetPageAsJson();
        if (!isNullOrUndefined(pageAsJson) && !isNullOrUndefined(pageAsJson.spPageContextInfo)) {
            globalThis["_spPageContextInfo"] = pageAsJson.spPageContextInfo;
        }
    }

    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        expandPageContext();
        return true;
    }

    return false;
}

export function isSPPageContextInfoReadySync() {
    const contextReady = !isTypeofFullNameNullOrUndefined("_spPageContextInfo");

    if (contextReady !== true) {
        let pageAsJson = GetPageAsJsonSync();
        if (!isNullOrUndefined(pageAsJson) && !isNullOrUndefined(pageAsJson.spPageContextInfo)) {
            globalThis["_spPageContextInfo"] = pageAsJson.spPageContextInfo;
        }
    }

    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        expandPageContext();
        return true;
    }

    return false;
}
function _getPageAsJsonRequestParams(url?: string) {
    if (isNullOrEmptyString(url)) {
        url = window.location.pathname;
    }

    return [
        `${url}?as=json`,
        null,
        {
            ...longLocalCache,
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "ACCEPT": "application/json; odata.metadata=minimal",
                "ODATA-VERSION": "4.0"
            }
        }
    ] as Parameters<typeof GetJson>;
}
export async function GetPageAsJson(url?: string) {
    try {
        let response = await GetJson<{
            spPageContextInfo: typeof _spPageContextInfo
        }>(..._getPageAsJsonRequestParams(url));

        return response;
    } catch {
    }

    return null;
}

export function GetPageAsJsonSync(url?: string) {
    try {
        let response = GetJsonSync<{
            spPageContextInfo: typeof _spPageContextInfo
        }>(..._getPageAsJsonRequestParams(url));

        return response.success === true ? response.result : null;
    } catch {
    }

    return null;
}

function isSPOCommonUrl() {
    let url = new URL(window.location.href);
    //Most cases are satisfied by this check. Very few customers have custom domains for SharePoint online.
    if (url.host.toLowerCase().endsWith(".sharepoint.com")) {
        return true;
    }
    return false;
}

function isSPOCachedURL() {
    let isSPO = getCacheItem<boolean>(`${window.location.host}_isSPO`);
    return isSPO === true;
}

function getAndCacheIsSharePointOnlineResult() {
    let isSPO = !isTypeofFullNameUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true;
    setCacheItem(`${window.location.host}_isSPO`, isSPO === true, { days: 365 });
    return isSPO === true;
}

function expandPageContext() {
    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")
        && (_spPageContextInfo as any)["_hasExpandPageContext"] === true) {
        return;
    }
    logger.groupSync("expandPageContext", log => {
        const ctx = _spPageContextInfo;
        (ctx as any)["_hasExpandPageContext"] = true;

        if (isNullOrUndefined(ctx.siteId)) {
            log("GetSiteIdSync");
            ctx.siteId = GetSiteIdSync(ctx.siteServerRelativeUrl);
        }

        if (isNullOrEmptyString(ctx.webId)) {
            log("GetWebIdSync");
            ctx.webId = GetWebIdSync(ctx.webServerRelativeUrl);
        }

        if (isNullOrUndefined(ctx.hasManageWebPermissions) && !isNullOrUndefined(ctx.webPermMasks)) {
            log("hasManageWebPermissions");
            let webPerms = new SPBasePermissions(_spPageContextInfo.webPermMasks);
            ctx.hasManageWebPermissions = webPerms.has(SPBasePermissionKind.ManageWeb);
        }

        if (isNullOrEmptyString(ctx.listId)) {
            log("ctx.listId");
            ctx.listId = ctx.pageListId;
        }

        if (isNotEmptyString(ctx.listId)) {
            //has list
            if (isNullOrEmptyString(ctx.listUrl)) {
                log("GetListRootFolderSync");
                ctx.listUrl = GetListRootFolderSync(ctx.webServerRelativeUrl, ctx.listId).ServerRelativeUrl;
            }

            if (isNullOrNaN(ctx.listBaseTemplate)) {
                log("GetListSync");
                const list = GetListSync(ctx.webServerRelativeUrl, ctx.listId);
                ctx.listTitle = list.Title;
                ctx.listBaseTemplate = list.BaseTemplate;
                //ctx.listBaseType = list.BaseType;
                ctx.listPermsMask = list.EffectiveBasePermissions;
            }

            if (isNullOrUndefined(ctx.pageItemId)) {
                log("ctx.pageItemId");
                let idParam = getQueryStringParameter("ID");
                if (isNotEmptyString(idParam) && isNumeric(idParam)) {
                    ctx.pageItemId = Number(idParam);
                }
            }

            if (isNullOrNaN(ctx.pageItemId)) {
                //no item, in a view
                if (isNullOrUndefined(ctx.viewId)) {
                    log("GetListViewsSync");
                    const viewEndsWith = window.location.pathname.substr(window.location.pathname.lastIndexOf("/")).toLowerCase();
                    const views = GetListViewsSync(ctx.webServerRelativeUrl, ctx.listId);
                    const view = firstOrNull(views, v => v.ServerRelativeUrl.toLowerCase().endsWith(viewEndsWith));
                    if (view)
                        ctx.viewId = view.Id;
                }
            }

            if (isNullOrEmptyString(ctx.userEmail)) {
                log("GetCurrentUserSync");
                const user = GetCurrentUserSync(ctx.webServerRelativeUrl);
                ctx.userEmail = user.Email;
                ctx.userDisplayName = user.Title;
            }

            log({ label: "expanded", value: ctx });
        }
    });
}