import { typeMonentJSTimeZone } from "../../exports-index";
import { sortArray } from "../../helpers/collections.base";
import { isISODate, isISODateUTC } from "../../helpers/date";
import { jsonStringify } from "../../helpers/json";
import { getGlobal } from "../../helpers/objects";
import { promiseLock } from "../../helpers/promises";
import { SPBasePermissions, extendFieldInfo } from "../../helpers/sharepoint";
import { normalizeGuid } from "../../helpers/strings";
import { isDate, isNotEmptyArray, isNullOrEmptyArray, isNullOrEmptyString, isNullOrNaN, isNullOrUndefined, isNumeric, isString, isTypeofFullNameNullOrUndefined, isValidGuid } from "../../helpers/typecheckers";
import { makeFullUrl, makeServerRelativeUrl, normalizeUrl } from "../../helpers/url";
import { IDictionary } from "../../types/common.types";
import { IRestOptions, jsonTypes } from "../../types/rest.types";
import { IContextWebInformation, IFieldInfoEX, IFolderInfo, IRententionLabel, ISiteGroupInfo, IUserCustomActionInfo, IWebInfo, SPBasePermissionKind } from "../../types/sharepoint.types";
import { IAppTile, IGroupInfo, IRestRoleDefinition, IRootWebInfo, ISiteInfo, ITimeZone, IUserInfo, IWebBasicInfo, IWebRegionalSettings, WebTypes, iContentType, iList } from "../../types/sharepoint.utils.types";
import { AutoDiscoverTenantInfo } from "../auth/discovery";
import { ConsoleLogger } from "../consolelogger";
import { toIsoDateFormat } from "../date";
import { MomentTimezoneJSKnownScript } from "../knownscript";
import { GetJson, GetJsonSync, extraLongLocalCache, longLocalCache, mediumLocalCache, noLocalCache, shortLocalCache, weeekLongLocalCache } from "../rest";
import { CONTENT_TYPES_SELECT, CONTENT_TYPES_SELECT_WITH_FIELDS, GetRestBaseUrl, GetSiteUrl, GetSiteUrlLocally, LIST_EXPAND, LIST_SELECT, WEB_SELECT, hasGlobalContext } from "./common";
import { GetListFields, GetListFieldsSync, GetListRestUrl } from "./list";
import { SPTimeZoneIdToIANATimeZoneName } from "./timzone-map";

const logger = ConsoleLogger.get("utils/sharepoint.rest/web");

export async function GetSiteInfo(siteUrl?: string): Promise<ISiteInfo> {
    siteUrl = GetSiteUrl(siteUrl);

    try {
        const r = await GetJson<{ d: ISiteInfo; }>(GetRestBaseUrl(siteUrl) + "/site?$select=id,serverRelativeUrl", null, { ...longLocalCache });
        var id = normalizeGuid(r.d.Id);
        var serverRelativeUrl = normalizeUrl(r.d.ServerRelativeUrl);
        if (isNullOrEmptyString(serverRelativeUrl)) serverRelativeUrl = "/"; //can't return "" since it will be treated as current sub site, when tyring to access the root site from a sub-site
        return { Id: id, ServerRelativeUrl: serverRelativeUrl };
    } catch {
        return null;
    }
}

export function GetSiteInfoSync(siteUrl?: string): ISiteInfo {
    siteUrl = GetSiteUrl(siteUrl);

    let result = GetJsonSync<{ d: ISiteInfo; }>(GetRestBaseUrl(siteUrl) + "/site?$select=id,serverRelativeUrl", null, { ...longLocalCache });
    if (result.success) {
        var id = normalizeGuid(result.result.d.Id);
        var serverRelativeUrl = normalizeUrl(result.result.d.ServerRelativeUrl);
        return { Id: id, ServerRelativeUrl: serverRelativeUrl };
    }
    return null;
}

function _getSiteIdFromContext(siteUrl?: string) {
    if (hasGlobalContext()) {
        //issue 7295
        //make sure we return false for /sites/ab/c is not under /sites/a by adding a / at the end
        let normalizedWebUrl = normalizeUrl(makeServerRelativeUrl(siteUrl), true).toLowerCase();
        let normalizedCurrentSiteUrl = normalizeUrl(_spPageContextInfo.siteServerRelativeUrl, true).toLowerCase();
        //test cases
        //if (!testSub("/", "/hello")) console.error("1");
        //if (testSub("/", "/sites/hello")) console.error("2");
        //if (testSub("/sites/a", "/sites/b")) console.error("3");
        //if (!testSub("/sites/a", "/sites/a/b")) console.error("4");
        //if (!testSub("/", "/")) console.error("5");
        //if (!testSub("/sites/a", "/sites/a")) console.error("6");
        //if (testSub("/sites/a", "/hello")) console.error("7");

        if (isNullOrUndefined(siteUrl)
            || normalizedCurrentSiteUrl === "/" && !normalizedWebUrl.startsWith("/sites")
            || normalizedCurrentSiteUrl !== "/" && normalizedWebUrl.startsWith(normalizedCurrentSiteUrl)) {
            if (!isNullOrEmptyString(_spPageContextInfo.siteId)) {
                return normalizeGuid(_spPageContextInfo.siteId);
            }
        }
    }
    return null;
}

/** Get tenant id lower case no {} */
export function GetTenantId() {
    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        return normalizeGuid(_spPageContextInfo.aadTenantId);
    }

    let info = AutoDiscoverTenantInfo(true);
    if (!isNullOrUndefined(info) && isValidGuid(info.idOrName)) {
        return normalizeGuid(info.idOrName);
    }

    return null;
}

/** Get tenant id lower case no {} */
export function GetPortalUrl() {
    if (hasGlobalContext()) {
        return _spPageContextInfo.portalUrl;
    }
    return null;
}

/** Get site id lower case no {} */
export async function GetSiteId(siteUrl?: string): Promise<string> {
    let siteId = _getSiteIdFromContext(siteUrl);
    if (!isNullOrEmptyString(siteId)) {
        return siteId;
    }

    return GetSiteInfo(siteUrl).then((info) => {
        if (!isNullOrUndefined(info) && !isNullOrEmptyString(info.Id)) {
            return normalizeGuid(info.Id);
        }
        return null;
    }).catch<string>(() => {
        return null;
    });
}

/** Get site id lower case no {} */
export function GetSiteIdSync(siteUrl?: string): string {
    let siteId = _getSiteIdFromContext(siteUrl);
    if (!isNullOrEmptyString(siteId)) {
        return siteId;
    }

    let result = GetSiteInfoSync(siteUrl);
    return !isNullOrUndefined(result) ? normalizeGuid(result.Id) : null;
}

/** Get root web id lower case no {} */
export function GetRootWebInfo(siteUrl?: string): Promise<IRootWebInfo> {
    siteUrl = GetSiteUrl(siteUrl);

    return GetJson<{ d: IRootWebInfo; }>(GetRestBaseUrl(siteUrl) + "/site/rootWeb?$select=id,serverRelativeUrl", null, { ...longLocalCache })
        .then(r => {
            var id = normalizeGuid(r.d.Id);
            var serverRelativeUrl = normalizeUrl(r.d.ServerRelativeUrl);
            //console.log("site id: " + id);
            return { Id: id, ServerRelativeUrl: serverRelativeUrl };
        })
        .catch<IRootWebInfo>(() => null);
}

/** Return the web Title */
export function GetWebTitle(siteUrl: string): Promise<string> {
    siteUrl = GetSiteUrl(siteUrl);

    return GetJson<{ d: { Title: string; }; }>(GetRestBaseUrl(siteUrl) + `/web/Title`, null, { ...shortLocalCache })
        .then(r => {
            return r.d.Title;
        })
        .catch<string>(() => null);
}

function _getWebIdRequestUrl(siteUrl: string) {
    return `${GetRestBaseUrl(siteUrl)}/web/Id`;
}

/** Return the web id */
export function GetWebId(siteUrl: string): Promise<string> {
    return GetJson<{ d: { Id: string; }; }>(_getWebIdRequestUrl(siteUrl), null, { ...longLocalCache })
        .then(r => {
            return normalizeGuid(r.d.Id);
        })
        .catch<string>(() => null);
}

/** Return the web id */
export function GetWebIdSync(siteUrl: string): string {
    let syncResult = GetJsonSync<{ d: { Id: string; }; }>(_getWebIdRequestUrl(siteUrl), null, { ...longLocalCache });
    if (syncResult.success)
        return syncResult.result.d.Id;
    else return null;
}

/** Return the web id */
export async function IsRootWeb(siteUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    let webId = await GetWebId(siteUrl);
    let rootWeb = await GetRootWebInfo(siteUrl);
    return webId === rootWeb.Id;
}

export function UserHasAllPermissions(siteUrl: string, permissions: SPBasePermissionKind[]): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    return GetJson<{ d: { EffectiveBasePermissions: { High: number; Low: number; }; }; }>(GetRestBaseUrl(siteUrl) + `/web/EffectiveBasePermissions`, null,
        { ...shortLocalCache })
        .then(r => {
            var effectivePermissions = new SPBasePermissions(r.d.EffectiveBasePermissions);
            return permissions.every((perm) => {
                return effectivePermissions.has(perm);
            });
        })
        .catch<boolean>(() => null);
}

export function UserHasManageSitePermissions(siteUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);
    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        if (siteUrl.startsWith(_spPageContextInfo.siteServerRelativeUrl))
            if (_spPageContextInfo.isSiteAdmin || _spPageContextInfo["isSiteOwner"]) return Promise.resolve(true);
    }

    return GetJson<{ d: { EffectiveBasePermissions: { High: number; Low: number; }; }; }>(GetRestBaseUrl(siteUrl) + `/web/EffectiveBasePermissions`, null,
        { ...shortLocalCache })
        .then(r => {
            return new SPBasePermissions(r.d.EffectiveBasePermissions).has(SPBasePermissionKind.ManageWeb);
        })
        .catch<boolean>(() => null);
}

export interface IGetContentTypesOptions {
    /** if you want content types for a specific list under site URL - ignores fromRootWeb */
    listIdOrTitle?: string;
    /** if you want content types from the root web - ignores listIdOrTitle */
    fromRootWeb?: boolean;
    ignoreFolders?: boolean;
    ignoreHidden?: boolean;
    /** Include fields associated with the content type */
    includeFields?: boolean;
}

function _getContentTypesRequestUrl(siteUrl: string, options: Omit<IGetContentTypesOptions, "ignoreFolders" | "ignoreHidden"> = {}) {
    const { fromRootWeb, includeFields, listIdOrTitle } = options;

    let query = `$select=${includeFields === true ? CONTENT_TYPES_SELECT : CONTENT_TYPES_SELECT_WITH_FIELDS}${includeFields === true ? "&$expand=Fields" : ""}`;

    if (!isNullOrEmptyString(listIdOrTitle)) {
        return `${GetListRestUrl(siteUrl, listIdOrTitle)}/contenttypes?${query}`;
    } else if (fromRootWeb) {
        return `${GetRestBaseUrl(siteUrl)}/site/rootweb/contenttypes?${query}`;
    } else {
        return `${GetRestBaseUrl(siteUrl)}/web/contenttypes?${query}`;
    }
}

function _postProcessGetContentTypes(contentTypes: iContentType[],
    options: Omit<IGetContentTypesOptions, "listIdOrTitle" | "fromRootWeb"> = {},
    allListFields?: IFieldInfoEX[]) {
    const { ignoreHidden, ignoreFolders, includeFields } = options;
    if (!isNullOrEmptyArray(contentTypes)) {
        if (ignoreFolders === true || ignoreHidden === true) {
            contentTypes = contentTypes.filter(rr => {
                if (options.ignoreFolders && rr.StringId.startsWith('0x0120')) return false;
                if (options.ignoreHidden && rr.Hidden) return false;
                return true;
            });
        }

        if (includeFields === true) {
            contentTypes.forEach((result) => {
                if (!isNullOrEmptyArray(result.Fields)) {
                    result.Fields = result.Fields.map((field) => {
                        return extendFieldInfo(field, allListFields || result.Fields);
                    });
                }
            });
        }
        return contentTypes;
    }
    return null;
}

export async function GetContentTypes(siteUrl: string, options: IGetContentTypesOptions = {}, refreshCache = false): Promise<iContentType[]> {
    let url = _getContentTypesRequestUrl(siteUrl, options);

    let allListFields: IFieldInfoEX[] = null;

    if (options.includeFields) {
        allListFields = await GetListFields(siteUrl, options.listIdOrTitle);
    }

    return GetJson<{ value: iContentType[]; }>(url, null, { allowCache: refreshCache !== true, jsonMetadata: jsonTypes.nometadata })
        .then(result => {
            if (!isNullOrUndefined(result)) {
                return _postProcessGetContentTypes(result.value, options, allListFields);
            }
            return null;
        })
        .catch<iContentType[]>(() => null);
}

export function GetContentTypesSync(siteUrl: string, options: IGetContentTypesOptions = {}, refreshCache = false): iContentType[] {
    let url = _getContentTypesRequestUrl(siteUrl, options);

    let allListFields: IFieldInfoEX[] = null;

    if (options.includeFields) {
        allListFields = GetListFieldsSync(siteUrl, options.listIdOrTitle);
    }

    let result = GetJsonSync<{ value: iContentType[]; }>(url, null, { allowCache: refreshCache !== true, jsonMetadata: jsonTypes.nometadata });
    if (!isNullOrUndefined(result) && result.success === true && !isNullOrUndefined(result.result)) {
        return _postProcessGetContentTypes(result.result.value, options, allListFields);
    }
    return null;
}


interface IGetListsOptions {
    includeRootFolders?: boolean;
    includeViews?: boolean;
    allowCache?: boolean;
}

function _getListsRequestUrl(siteUrl: string, options: IGetListsOptions) {
    let select = LIST_SELECT;
    let expand = LIST_EXPAND;
    if (options.includeRootFolders === true) {
        select += ",RootFolder/Name,RootFolder/ServerRelativeUrl";
        expand += ",RootFolder";
    }
    if (options.includeViews === true) {
        expand += ",Views";
    }

    return GetRestBaseUrl(siteUrl) + `/web/lists?$select=${select}&$expand=${expand}`;
}

function _postProcessGetLists(lists: iList[], options: Omit<IGetListsOptions, "includeRootFolders"> = {}) {
    lists = lists || [];
    if (options && options.includeViews) {
        lists.forEach(l => {
            if (isNullOrEmptyArray(l.Views)) {
                l.Views = [];
            }
            l.Views.forEach(v => { v.Id = normalizeGuid(v.Id); });
        });
    }

    lists.forEach((list) => {
        if (list.EffectiveBasePermissions
            && (isString(list.EffectiveBasePermissions.High)
                || isString(list.EffectiveBasePermissions.Low))) {
            list.EffectiveBasePermissions = {
                High: Number(list.EffectiveBasePermissions.High),
                Low: Number(list.EffectiveBasePermissions.Low)
            };
        }
    });
    return lists;
}

export function GetLists(siteUrl: string, options: IGetListsOptions = {}): Promise<iList[]> {
    let url = _getListsRequestUrl(siteUrl, options);
    const allowCache = options.allowCache === undefined ? true : options.allowCache;
    return GetJson<{ value: iList[]; }>(url, null, { allowCache, jsonMetadata: jsonTypes.nometadata })
        .then(result => {
            return _postProcessGetLists(result.value, options);
        })
        .catch<iList[]>(() => []);
}

export function GetListsSync(siteUrl: string, options: IGetListsOptions = {}): iList[] {
    let url = _getListsRequestUrl(siteUrl, options);

    let response = GetJsonSync<{ value: iList[]; }>(url, null, { ...shortLocalCache, jsonMetadata: jsonTypes.nometadata });
    if (response && response.success && response.result && isNotEmptyArray(response.result.value)) {
        return _postProcessGetLists(response.result.value, options);
    }
    return [];
}

/**
 * Get all sub webs. Results will be cached in memory and sorted
 * @param siteUrl the starting URL you want to get the sites for
 * @param allowAppWebs send true if you would like to inlucde app webs as well
 */
export async function GetAllSubWebs(siteUrl: string, options?: { allSiteCollections?: boolean; allowAppWebs?: boolean; }): Promise<IWebBasicInfo[]> {
    siteUrl = GetSiteUrl(siteUrl);

    let sites: IWebBasicInfo[] = [];
    options = options || {};
    var currentSite: IWebBasicInfo;
    var queryFailed = false;

    try {
        currentSite = await GetWebInfo(siteUrl);
        let queryFilter = '';
        if (!options.allSiteCollections) {
            //filter by site id
            let siteId = await GetSiteId(siteUrl);
            queryFilter = `SiteId:${siteId}`;
        }

        //Issue 6735 missing WebId for some customer (US, government GCC tenant will not return WebId)
        let queryUrl = `${GetRestBaseUrl(siteUrl)}/search/query?querytext=%27${queryFilter}(contentclass:STS_Site)%20(contentclass:STS_Web)%27&trimduplicates=false&rowlimit=5000&selectproperties=%27Title,Url,WebTemplate,WebId%27`;
        let response = await GetJson<{
            d: {
                query: {
                    PrimaryQueryResult: {
                        RelevantResults: {
                            RowCount: number;
                            TotalRows: number;
                            TotalRowsIncludingCuplicates: number;
                            Table: {
                                Rows: {
                                    results: {
                                        Cells: {
                                            results: {
                                                Key: "Title" | "Url" | "SiteId" | "WebId" | "WebTemplate";
                                                Value: string;
                                                ValueType: "Edm.String" | "Edm.Double" | "Edm.Int64" | "Edm.Int32" | "Edm.Guid" | "Null";
                                            }[];
                                        };
                                    }[];
                                };
                            };
                        };
                    };
                };
            };
        }>(queryUrl, null, { ...shortLocalCache });

        let results = response && response.d && response.d.query && response.d.query.PrimaryQueryResult;

        let addedSites: string[] = [];
        if (results && results.RelevantResults.RowCount >= 0) {
            let allPropsFound = false;
            results.RelevantResults.Table.Rows.results.forEach(row => {
                let Title: string = null;
                let Url: string = null;
                let WebId: string = null;
                let WebTemplate: string = null;
                let skip = false;
                for (var i = 0; i < row.Cells.results.length; i++) {
                    let cell = row.Cells.results[i];
                    let value = isNullOrEmptyString(cell.Value) ? "" : cell.Value;
                    switch (cell.Key) {
                        case "WebTemplate":
                            WebTemplate = value;
                            if (!options.allowAppWebs && value === "APP")
                                skip = true;
                            break;
                        case "Title":
                            Title = value;
                            break;
                        case "WebId":
                            WebId = normalizeGuid(value);
                            break;
                        case "Url":
                            if (addedSites.indexOf(value.toLowerCase()) >= 0) {
                                //duplicate, skip
                                skip = true;
                            }
                            else {
                                Url = value;
                            }
                            break;
                    }
                    if (skip)
                        break;//stop the cells loop
                    allPropsFound =
                        Title !== null &&
                        Url !== null &&
                        WebId !== null &&
                        WebTemplate !== null;
                    if (allPropsFound)
                        break;
                }

                if (!skip && allPropsFound)//don't skip, and we found all needed props
                {
                    sites.push({
                        Title: Title,
                        ServerRelativeUrl: makeServerRelativeUrl(Url),
                        WebId: WebId,
                        WebTemplate: WebTemplate,
                        WebType: WebTemplate === "APP" ? WebTypes.App :
                            WebTemplate === "GROUP" ? WebTypes.Group :
                                WebTemplate === "STS" ? WebTypes.Team :
                                    WebTypes.Other
                    });
                }
            });
        }

        //Issue 7161
        if (sites.length === 1 || (!isNullOrUndefined(currentSite) && !sites.filter((site) => {
            return site.WebId !== currentSite.WebId;
        })[0])) {
            queryFailed = true;
        }
    } catch (e) {
        queryFailed = true;
    }

    if (queryFailed) {
        // Igor: Issue #7702
        if (hasGlobalContext() && _spPageContextInfo && _spPageContextInfo.siteServerRelativeUrl.toLowerCase() !== siteUrl.toLowerCase()) {
            //siteUrl = _spPageContextInfo.siteServerRelativeUrl;
            //currentSite = await GetWebInfo(siteUrl);
            //Kevin: Issue 1028
            //The user may not have permission to the site collection root web. Instead of overwirting the currentSite/siteUrl,
            //we make a request for the site collection root web. If we get a valid response, replace currentSite/siteUrl with 
            //the site collection root web info.
            let currentSiteCollection = await GetWebInfo(_spPageContextInfo.siteServerRelativeUrl);

            if (currentSiteCollection && !isNullOrEmptyString(currentSiteCollection.ServerRelativeUrl)) {
                currentSite = currentSiteCollection;
                siteUrl = _spPageContextInfo.siteServerRelativeUrl;
            }
        }

        //add current site                
        if (currentSite && (options.allowAppWebs || currentSite.WebType !== WebTypes.App)) {
            sites.push(currentSite);
        }

        //Issue 6651
        //add sub sites
        //if the query failed, we can't rely on search to get the subwebs
        var currentSiteSubSites = await __getSubSites(siteUrl, options.allowAppWebs);
        if (isNotEmptyArray(currentSiteSubSites)) {
            sites = [...sites, ...currentSiteSubSites];
        }
    }

    var webIds = [];
    var filteredSites: IWebBasicInfo[] = [];
    for (let site of sites) {
        if (webIds.indexOf(site.WebId) === -1) {
            webIds.push(site.WebId);
            filteredSites.push(site);
        }
    }

    sortArray(filteredSites, s => s.ServerRelativeUrl);

    return filteredSites;
}

export async function __getSubSites(siteUrl: string, allowAppWebs?: boolean) {
    siteUrl = GetSiteUrl(siteUrl);

    let sites: IWebBasicInfo[] = [];

    //try {
    //maybe search is not wokring? use regular REST API
    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/getsubwebsfilteredforcurrentuser(nwebtemplatefilter=-1,nconfigurationfilter=0)?$Select=Title,ServerRelativeUrl,Id,WebTemplate`;
    let result = await GetJson<{
        d: {
            results: {
                Title: string;
                ServerRelativeUrl: string;
                Id: string;
                WebTemplate: string;
            }[];
        };
    }>(restUrl, null, { ...shortLocalCache });
    if (result && result.d && isNotEmptyArray(result.d.results)) {
        let results = (allowAppWebs) ? result.d.results : result.d.results.filter(s => s.WebTemplate !== "APP");
        let promises: Promise<IWebBasicInfo[]>[] = [];
        results.forEach(s => {
            sites.push({
                Title: s.Title,
                ServerRelativeUrl: s.ServerRelativeUrl,
                WebId: s.Id,
                WebTemplate: s.WebTemplate,
                WebType: s.WebTemplate === "APP" ? WebTypes.App :
                    s.WebTemplate === "GROUP" ? WebTypes.Group :
                        s.WebTemplate === "STS" ? WebTypes.Team :
                            WebTypes.Other
            });
            promises.push(__getSubSites(s.ServerRelativeUrl, allowAppWebs));
        });
        //loop and add all sub sites
        let allSubs = await Promise.all(promises);
        allSubs.forEach(subSubs => {
            sites.push(...subSubs);
        });
    }
    //}
    //catch {
    //}
    return sites;
}

interface IGetWebInfoResponse {
    Title: string;
    ServerRelativeUrl: string;
    Id: string;
    WebTemplate: string;
    Description: string,
    SiteLogoUrl: string
}

function _getWebInfoByIdRequestUrl(siteUrl: string, webId: string) {
    return `${GetRestBaseUrl(siteUrl)}/site/openWebById('${webId}')?$Select=${WEB_SELECT}`;
}

function _getCurrentWebInfoRequestUrl(siteUrl: string) {
    return `${GetRestBaseUrl(siteUrl)}/web?$Select=${WEB_SELECT}`;
}

function _postProcessGetWebInfo(webInfo: IGetWebInfoResponse) {
    if (!isNullOrUndefined(webInfo)) {
        return {
            Title: webInfo.Title,
            ServerRelativeUrl: webInfo.ServerRelativeUrl,
            WebId: webInfo.Id,
            WebTemplate: webInfo.WebTemplate,
            WebType: GetWebType(webInfo.WebTemplate),
            Description: webInfo.Description,
            SiteLogoUrl: webInfo.SiteLogoUrl
        } as IWebBasicInfo;
    }
    return null;
}

export async function GetWebInfo(siteUrl: string, webId?: string, refreshCache?: boolean): Promise<IWebBasicInfo> {
    let webInfoResponse: IGetWebInfoResponse = null;

    try {
        if (!isNullOrEmptyString(webId) && isValidGuid(webId)) {
            webId = normalizeGuid(webId);
            let currentWebId = await GetWebId(siteUrl);
            if (currentWebId !== webId) {
                let url = _getWebInfoByIdRequestUrl(siteUrl, webId);
                webInfoResponse = await GetJson<IGetWebInfoResponse>(url, null, {
                    method: "POST", spWebUrl: GetSiteUrlLocally(siteUrl), ...shortLocalCache,
                    jsonMetadata: jsonTypes.nometadata,
                    allowCache: refreshCache !== true
                });
            }
        }

        if (isNullOrUndefined(webInfoResponse)) {
            let url = _getCurrentWebInfoRequestUrl(siteUrl);
            webInfoResponse = await GetJson<IGetWebInfoResponse>(url, null, {
                ...shortLocalCache,
                jsonMetadata: jsonTypes.nometadata,
                allowCache: refreshCache !== true
            });
        }

    } catch (e) { }

    return _postProcessGetWebInfo(webInfoResponse);
}

export function GetWebInfoSync(siteUrl: string, webId?: string): IWebBasicInfo {
    let webInfoResponse: IGetWebInfoResponse = null;

    if (!isNullOrEmptyString(webId) && isValidGuid(webId)) {
        webId = normalizeGuid(webId);
        let currentWebId = GetWebIdSync(siteUrl);
        if (currentWebId !== webId) {
            let url = _getWebInfoByIdRequestUrl(siteUrl, webId);
            let syncResult = GetJsonSync<IGetWebInfoResponse>(url, null, {
                method: "POST", spWebUrl: GetSiteUrlLocally(siteUrl), ...shortLocalCache,
                jsonMetadata: jsonTypes.nometadata
            });
            if (syncResult.success) {
                webInfoResponse = syncResult.result;
            }
        }
    }

    if (isNullOrUndefined(webInfoResponse)) {
        let url = _getCurrentWebInfoRequestUrl(siteUrl);
        let syncResult = GetJsonSync<IGetWebInfoResponse>(url, null, {
            ...shortLocalCache,
            jsonMetadata: jsonTypes.nometadata
        });
        if (syncResult.success) {
            webInfoResponse = syncResult.result;
        }
    }

    return _postProcessGetWebInfo(webInfoResponse);
}

export async function GetWebRoleDefinitions(siteUrl: string): Promise<IRestRoleDefinition[]> {
    return GetJson<{ d: { results: IRestRoleDefinition[]; }; }>(GetRestBaseUrl(siteUrl) + `/web/RoleDefinitions?filter=Hidden ne true`, null, { ...longLocalCache })
        .then(r => {
            return r.d.results || [];
        })
        .catch<IRestRoleDefinition[]>(() => []);
}

export interface iRoleAssignment {
    Member: IGroupInfo | IUserInfo,
    RoleDefinitionBindings: IRestRoleDefinition[],
    PrincipalId: 14
};
/** get roles for site or list */
export async function GetRoleAssignments(siteUrl: string, listIdOrTitle?: string, itemId?: number) {
    const url = `${isNullOrEmptyString(listIdOrTitle) ? GetRestBaseUrl(siteUrl) + "/web" : GetListRestUrl(siteUrl, listIdOrTitle)}/${isNullOrNaN(itemId) ? '' : `items(${itemId})/`}roleassignments?$expand=Member/users,RoleDefinitionBindings`;
    const result = await GetJson<{ value: iRoleAssignment[] }>(url, undefined, { jsonMetadata: jsonTypes.nometadata });
    return result.value;
}

/** Web sub webs for the selected site */
export async function GetSubWebs(siteUrl: string, options?: { allowAppWebs?: boolean; }): Promise<IWebInfo[]> {
    return GetJson<{ d: { results: IWebInfo[]; }; }>(GetRestBaseUrl(siteUrl) + `/web/webs${options && options.allowAppWebs ? "" : "&$filter=WebTemplate ne 'APP'"}`, null,
        { ...shortLocalCache })
        .then(r => {
            return r.d.results;
        })
        .catch<IWebInfo[]>(() => []);
}

/** Web sub webs for the selected site */
export async function GetAppTiles(siteUrl: string): Promise<IAppTile[]> {
    //Issue 933 this api does not work in a classic app web
    if (hasGlobalContext() && _spPageContextInfo.isAppWeb) {
        logger.warn('GetAppTiles does not work in an app web');
        return null;
    }

    return GetJson<{ value: IAppTile[]; }>(GetRestBaseUrl(siteUrl) + "/web/AppTiles?$filter=AppType%20eq%203&$select=Title,ProductId", null,
        { ...shortLocalCache, jsonMetadata: jsonTypes.nometadata })
        .then(r => {
            return isNotEmptyArray(r.value) ? r.value.map(t => {
                return {
                    Title: t.Title,
                    ProductId: normalizeGuid(t.ProductId)
                } as IAppTile;
            }) : [];
        })
        .catch<IAppTile[]>(() => []);
}

/** Web sub webs for the selected site */
export function GetAppTilesSync(siteUrl: string): IAppTile[] {
    siteUrl = GetSiteUrl(siteUrl);

    //Issue 933 this api does not work in a classic app web
    if (hasGlobalContext() && _spPageContextInfo.isAppWeb) {
        logger.warn('GetAppTiles does not work in an app web');
        return null;
    }

    let r = GetJsonSync<{ value: IAppTile[]; }>(GetRestBaseUrl(siteUrl) + "/web/AppTiles?$filter=AppType%20eq%203&$select=Title,ProductId", null,
        { ...shortLocalCache, jsonMetadata: jsonTypes.nometadata });
    return r.success && r.result && isNotEmptyArray(r.result.value) ? r.result.value.map(t => {
        return {
            Title: t.Title,
            ProductId: normalizeGuid(t.ProductId)
        } as IAppTile;
    }) : [];
}

function GetWebType(WebTemplate: string): WebTypes {
    return WebTemplate === "APP" ? WebTypes.App :
        WebTemplate === "GROUP" ? WebTypes.Group :
            WebTemplate === "STS" ? WebTypes.Team :
                WebTypes.Other;
}

export async function GetServerTimeZone(siteUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let getTimeZoneUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone`;

    let result = await GetJson<{
        d: ITimeZone;
    }>(getTimeZoneUrl, null, { ...extraLongLocalCache });

    if (result && result.d && !isNullOrUndefined(result.d)) {
        return result.d;
    }
    else return null;
}

export function GetServerTimeZoneSync(siteUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let getTimeZoneUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone`;

    let response = GetJsonSync<{
        d: ITimeZone;
    }>(getTimeZoneUrl, null, { ...extraLongLocalCache });

    if (response && response.result.d && !isNullOrUndefined(response.result.d)) {
        return response.result.d;
    }
    else return null;
}

/**
 * to be used when parsing string date to date object in JavaScript like so:
 * var clientTimezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
 * var clientDate = new Date(value);
 * var serverDate = new Date(clientDate.getTime() + clientTimezoneOffset + GetServerTimeOffset);
 * We must send a date in, since places like Israel have different offset for specific dates (GMT+2 or GMT+3)
 * or just call SPServerLocalTimeToUTCDate
 */
async function GetServerTimeOffset(siteUrl: string, date: Date) {
    siteUrl = GetSiteUrl(siteUrl);

    let dateStr = toIsoDateFormat(date, { zeroTime: true, omitZ: true });
    let inputDate = new Date(dateStr);

    let getTimeZoneOffsetUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/localTimeToUTC(@date)?@date='${encodeURIComponent(dateStr)}'`;

    let result = await GetJson<{ value: string; }>(getTimeZoneOffsetUrl, null, { ...weeekLongLocalCache, jsonMetadata: jsonTypes.nometadata });
    if (result && !isNullOrEmptyString(result.value)) {
        let resultDate = new Date(result.value.slice(0, result.value.length - 1));//remove Z and get as date.

        return (resultDate.getTime() - inputDate.getTime());
    }
    else return 0;
}
/**
 * to be used when parsing string date to date object in JavaScript like so:
 * var clientTimezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
 * var clientDate = new Date(value);
 * var serverDate = new Date(clientDate.getTime() + clientTimezoneOffset + GetServerTimeOffset);
 * We must send a date in, since places like Israel have different offset for specific dates (GMT+2 or GMT+3)
 * or just call SPServerLocalTimeToUTCDate
 */
function GetServerTimeOffsetSync(siteUrl: string, date: Date) {
    siteUrl = GetSiteUrl(siteUrl);

    let dateStr = toIsoDateFormat(date, { zeroTime: true, omitZ: true });
    let inputDate = new Date(dateStr);

    let getTimeZoneOffsetUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/localTimeToUTC(@date)?@date='${encodeURIComponent(dateStr)}'`;

    let result = GetJsonSync<{ value: string; }>(getTimeZoneOffsetUrl, null, { ...weeekLongLocalCache, jsonMetadata: jsonTypes.nometadata });
    if (result && result.success && !isNullOrEmptyString(result.result.value)) {
        let resultDate = new Date(result.result.value.slice(0, result.result.value.length - 1));//remove Z and get as date.

        return (resultDate.getTime() - inputDate.getTime());
    }
    else return 0;
}

/** get date yyyy-MM-ddTHH:mm:ss NO ZED, or a date object created in the server local time, and return a date object of the corrected UTC time */
export async function SPServerLocalTimeToUTCDate(siteUrl: string, date: string | Date) {
    //used in 7700
    if (isNullOrEmptyString(date)) return null;
    siteUrl = GetSiteUrl(siteUrl);
    if (!isDate(date))
        date = new Date(date);

    let serverTimeOffset = await GetServerTimeOffset(siteUrl, date);
    return _SPServerLocalTimeToUTCDate(date, serverTimeOffset);
}

/** get date yyyy-MM-ddTHH:mm:ss NO ZED, or a date object created in the server local time, and return a date object of the corrected UTC time */
export function SPServerLocalTimeToUTCDateSync(siteUrl: string, date: string | Date) {
    //used in 7700
    if (isNullOrEmptyString(date)) return null;
    siteUrl = GetSiteUrl(siteUrl);
    if (!isDate(date))
        date = new Date(date);

    let serverTimeOffset = GetServerTimeOffsetSync(siteUrl, date);
    return _SPServerLocalTimeToUTCDate(date, serverTimeOffset);
}

function _SPServerLocalTimeToUTCDate(date: Date, serverTimeOffset: number) {
    let localTimeOffset = date.getTimezoneOffset() * 60000;
    return new Date(serverTimeOffset - localTimeOffset + date.getTime());
}

/** get date yyyy-MM-ddTHH:mm:ss NO ZED
 * returns yyyy-MM-ddTHH:mm:ssZ
 * expensive, but works. for faster bulk parsing use toIsoDateFormat(new Date(GetServerTimeOffset + date.getTime()))
 * or: SPServerLocalTimeToUTCDate
 */
export async function SPServerLocalTimeToUTC(siteUrl: string, date: string | Date) {
    siteUrl = GetSiteUrl(siteUrl);

    if (isDate(date)) {
        date = toIsoDateFormat(date, { omitZ: true });
    }

    let regionalSettings = await GetServerTimeZone(siteUrl);
    let timeZone = SPTimeZoneIdToIANATimeZoneName[`${regionalSettings.Id}`];

    // todo: Include the moment/moment-timezone library as a depondency so it can be imported and chunked using webpack to reduce
    // bundled package size
    if (!isNullOrEmptyString(timeZone) && globalThis instanceof Window) {
        try {
            let momentTimezone = await MomentTimezoneJSKnownScript.load();
            let result = _momentLocalISOToUTC(date, timeZone, momentTimezone);
            if (!isNullOrEmptyString(result)) {
                logger.debug(`SPServerLocalTimeToUTC -> date: ${date}, result: ${result}, timeZone: ${timeZone}`);
                return result;
            }
        } catch {
        }
    }

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/localTimeToUTC(@date)?@date='${encodeURIComponent(date)}'`;

    let result = await GetJson<{ value: string; }>(restUrl, null, { ...weeekLongLocalCache, jsonMetadata: jsonTypes.nometadata });
    return result && result.value || null;
}
/** 
 * convert date in ISO format (yyyy-MM-ddTHH:mm:ss) or SPServerLocalTime (5/27/2020 11:34, 5-27-2020 11:34)
 * returns date in ISO UTC (yyyy-MM-ddTHH:mm:ssZ)
 * expensive, but works. for faster bulk parsing use toIsoDateFormat(new Date(GetServerTimeOffset + date.getTime()))
 * or: SPServerLocalTimeToUTCDateSync
 */
export function SPServerLocalTimeToUTCSync(siteUrl: string, date: string | Date) {
    siteUrl = GetSiteUrl(siteUrl);

    if (isDate(date)) {
        date = toIsoDateFormat(date, { omitZ: true });
    }

    let regionalSettings = GetServerTimeZoneSync(siteUrl);
    let timeZone = SPTimeZoneIdToIANATimeZoneName[`${regionalSettings.Id}`];

    // todo: Include the moment/moment-timezone library as a depondency so it can be imported and chunked using webpack to reduce
    // bundled package size
    if (!isNullOrEmptyString(timeZone)) {
        try {
            let momentTimezone = MomentTimezoneJSKnownScript.loadSync();
            let result = _momentLocalISOToUTC(date, timeZone, momentTimezone);
            if (!isNullOrEmptyString(result)) {
                logger.debug(`SPServerLocalTimeToUTCSync -> date: ${date}, result: ${result}, timeZone: ${timeZone}`);
                return result;
            }
        } catch {
        }
    }

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/localTimeToUTC(@date)?@date='${encodeURIComponent(date)}'`;

    let result = GetJsonSync<{ value: string; }>(restUrl, null, { ...weeekLongLocalCache, jsonMetadata: jsonTypes.nometadata });
    return result.success && result.result.value || null;
}

//todo: move to types
type IntlDateSupportedLocales = "en-CA" | "sv-SE";

/** get utc date yyyy-MM-ddTHH:mm:ssZ
 * returns yyyy-MM-ddTHH:mm:ss NO ZED
 * expensive, but works. for faster bulk parsing use toIsoDateFormat(new Date(date.getTime()-GetServerTimeOffset,{omitZ:true}))
 */
export async function UTCToSPServerLocalTime(siteUrl: string, date: string | Date) {
    siteUrl = GetSiteUrl(siteUrl);

    if (isDate(date)) {
        date = toIsoDateFormat(date);
    }

    let regionalSettings = await GetServerTimeZone(siteUrl);
    let timeZone = SPTimeZoneIdToIANATimeZoneName[`${regionalSettings.Id}`];

    if (!isNullOrEmptyString(timeZone)) {
        try {
            let momentTimezone = await MomentTimezoneJSKnownScript.load();
            let result = _momentUTCToLocalISO(date, timeZone, momentTimezone);
            if (!isNullOrEmptyString(result)) {
                logger.debug(`UTCToSPServerLocalTime -> date: ${date}, result: ${result}, timeZone: ${timeZone}`);
                return result;
            }
        } catch {
        }

        if (_canUseIntlDateTimeFormat(date)) {
            let supportedFormattingLocale = _getSupportedFormattingLocaleForUTCToSPServerTime();
            if (!isNullOrEmptyString(supportedFormattingLocale)) {
                try {
                    let result = _UTCDateStringToSPServerLocalDateString(date, timeZone, supportedFormattingLocale);
                    if (!isNullOrEmptyString(result)) {
                        return result;
                    }
                } catch {
                }
            }
        }
    }

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/utcToLocalTime(@date)?@date='${encodeURIComponent(date)}'`;
    let result = await GetJson<{ value: string; }>(restUrl, null, { ...longLocalCache, jsonMetadata: jsonTypes.nometadata });
    return result && result.value || null;
}

/** get utc date yyyy-MM-ddTHH:mm:ssZ
 * returns yyyy-MM-ddTHH:mm:ss NO ZED
 * expensive, but works. for faster bulk parsing use toIsoDateFormat(new Date(date.getTime()-GetServerTimeOffset,{omitZ:true}))
 */
export function UTCToSPServerLocalTimeSync(siteUrl: string, date: string | Date) {
    siteUrl = GetSiteUrl(siteUrl);

    if (isDate(date)) {
        date = toIsoDateFormat(date);
    }

    let regionalSettings = GetServerTimeZoneSync(siteUrl);
    let timeZone = SPTimeZoneIdToIANATimeZoneName[`${regionalSettings.Id}`];

    if (!isNullOrEmptyString(timeZone) && typeof window !== "undefined") {
        try {
            let momentTimezone = MomentTimezoneJSKnownScript.loadSync();
            let result = _momentUTCToLocalISO(date, timeZone, momentTimezone);
            if (!isNullOrEmptyString(result)) {
                logger.debug(`UTCToSPServerLocalTimeSync -> date: ${date}, result: ${result}, timeZone: ${timeZone}`);
                return result;
            }
        } catch {
        }

        if (_canUseIntlDateTimeFormat(date)) {
            let supportedFormattingLocale = _getSupportedFormattingLocaleForUTCToSPServerTime();
            if (!isNullOrEmptyString(supportedFormattingLocale)) {
                try {
                    let result = _UTCDateStringToSPServerLocalDateString(date, timeZone, supportedFormattingLocale);
                    if (!isNullOrEmptyString(result)) {
                        return result;
                    }
                } catch {
                }
            }
        }
    }

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings/timeZone/utcToLocalTime(@date)?@date='${encodeURIComponent(date)}'`;
    let result = GetJsonSync<{ value: string; }>(restUrl, null, { ...longLocalCache, jsonMetadata: jsonTypes.nometadata });
    return result.success && result.result.value || null;
}

function _momentUTCToLocalISO(date: string, timeZone: string, momentTimezone: typeMonentJSTimeZone) {
    try {
        if (momentTimezone.names().includes(timeZone) && isISODateUTC(date)) {
            let specificTimeInTimezone = momentTimezone(
                date,
                timeZone
            );

            let result = specificTimeInTimezone.format('YYYY-MM-DDTHH:mm:ss');
            if (!isNullOrEmptyString(result)) {
                return result;
            }
        }
    } catch {
    }
    return null;
}

function _momentLocalISOToUTC(date: string, timeZone: string, momentTimezone: typeMonentJSTimeZone) {
    try {
        if (momentTimezone.names().includes(timeZone) && isISODate(date)) {
            let specificTimeInTimezone = momentTimezone(
                date,
                'YYYY-MM-DDThh:mm:ss',
                timeZone
            );

            let utcTime = specificTimeInTimezone.utc();
            let result = utcTime.format();
            if (!isNullOrEmptyString(result)) {
                return result;
            }
        }
    } catch {
    }
    return null;
}

function _canUseIntlDateTimeFormat(ISOdate: string) {
    // Intl.DateTimeFormat has an issue with older dates
    // https://stackoverflow.com/questions/43454520/timezone-issue-with-intl-datetimeformat-for-old-dates
    return new Date(ISOdate).getFullYear() > 1975;
}

function _getSupportedFormattingLocaleForUTCToSPServerTime() {
    try {
        let supportedLocales = Intl.DateTimeFormat.supportedLocalesOf(["en-CA", "sv-SE"]) as IntlDateSupportedLocales[];
        return supportedLocales[0] as IntlDateSupportedLocales;
    } catch {
    }
    return null;
}

function _UTCDateStringToSPServerLocalDateString(utcISODate: string, targetIanaTimeZone: string, supportedLocale: IntlDateSupportedLocales) {
    let formatter = new Intl.DateTimeFormat(supportedLocale, {
        timeZone: targetIanaTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false
    });

    let value1 = formatter.format(new Date(utcISODate))
    if (supportedLocale.toLowerCase() === "en-ca") {
        value1 = value1.replace(",", "").replace(" ", "T").split(".000")[0];
    } else {
        value1 = value1.replace(",", ".").replace(" ", "T").split(".000")[0];
    }

    return isISODate(value1) ? value1 : null;
}

export function SPServerLocalTimeSync(siteUrl?: string) {
    siteUrl = GetSiteUrl(siteUrl);

    var clientNowServerDeltas = getGlobal<{ [url: string]: number; }>("ClientNowServerDeltas");
    var clientNowServerDelta = clientNowServerDeltas[siteUrl];
    var now = new Date();

    if (isNullOrUndefined(clientNowServerDelta)) {
        var local = UTCToSPServerLocalTimeSync(siteUrl, now.toISOString());
        clientNowServerDelta = (+now - +(new Date(local)));
        clientNowServerDeltas[siteUrl] = clientNowServerDelta;
    }

    var newdate = new Date(+now - clientNowServerDelta);
    return toIsoDateFormat(newdate, { omitZ: true });
}

export async function SPServerLocalTime(siteUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);

    var clientNowServerDeltas = getGlobal<{ [url: string]: number; }>("ClientNowServerDeltas");
    var clientNowServerDelta = clientNowServerDeltas[siteUrl];
    var now = new Date();

    if (isNullOrUndefined(clientNowServerDelta)) {
        var local = await UTCToSPServerLocalTime(siteUrl, now.toISOString());
        clientNowServerDelta = (+now - +(new Date(local)));
        clientNowServerDeltas[siteUrl] = clientNowServerDelta;
    }

    var newdate = new Date(+now - clientNowServerDelta);
    return toIsoDateFormat(newdate, { omitZ: true });
}

export async function SPServerLocalToday(siteUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);

    return promiseLock(`SPServerLocalToday)_${siteUrl}`, async () => {
        return SPServerLocalTime(siteUrl);
    }, 30000);
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
        postCacheKey: `GetContextWebInformation_${normalizeGuid(siteId)}`
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
            postCacheKey: `GetContextWebInformation_${normalizeGuid(siteId)}`
        });
        return result.d.GetContextWebInformation;
    } catch {
        return null;
    }
}

function _getCustomActionsBaseRestUrl(siteUrl?: string, options: { listId?: string, actionId?: string } = {}) {
    const { listId, actionId } = { ...options };

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web`;

    if (!isNullOrEmptyString(listId)) {
        restUrl += `/lists('${normalizeGuid(listId)}')`;
    }

    restUrl += `/UserCustomActions`;

    if (!isNullOrEmptyString(actionId)) {
        restUrl += `('${actionId}')`;
    }

    return restUrl;
}

function _parseCustomActionReponse(action: IUserCustomActionInfo) {
    if (isNullOrUndefined(action)) {
        return action;
    }

    if (!isNullOrUndefined(action.Rights) && !isString(action.Rights)) {
        if (isNumeric(action.Rights.High)) {
            action.Rights.High = Number(action.Rights.High)
        }
        if (isNumeric(action.Rights.Low)) {
            action.Rights.Low = Number(action.Rights.Low);
        }
    }
    return action;
}

function _convertCustomActionToPostData(action: Omit<Partial<IUserCustomActionInfo>, "Id">) {
    //The rest end point expects the rights in string format for some odd reason despite IBasePermissions being stored
    //as High/Low numbers and the methods using numbers (ie. SPBasePermission). Even EffectiveBasePermissions on
    //a list are stored using numbers.
    let hasRights = !isNullOrUndefined(action.Rights);
    let partialAction: {
        Rights: string | {
            High: string;
            Low: string;
        };
    };
    if (hasRights) {
        partialAction = {
            Rights: {
                High: `${action.Rights.High}`,
                Low: `${action.Rights.Low}`
            }
        };
        delete action.Rights;
    }

    let data = { ...action, ...partialAction };

    return data;
}

/** Get UserCustomActions for web/list */
export async function GetUserCustomActions(siteUrl: string, listId?: string, allowCache = true): Promise<IUserCustomActionInfo[]> {
    let restUrl = _getCustomActionsBaseRestUrl(siteUrl, { listId: listId });
    let cacheOptions = allowCache === true ? shortLocalCache : { allowCache: false };
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        ...cacheOptions
    };

    try {
        let response = await GetJson<{ value: IUserCustomActionInfo[]; }>(restUrl, null, restOptions);
        if (!isNullOrUndefined(response) && !isNullOrEmptyArray(response.value)) {
            return response.value.map(_parseCustomActionReponse);
        }
    } catch {
    }

    return [];
}

/** Get UserCustomAction by id from web/list */
export async function GetUserCustomActionById(siteUrl: string, customActionId: string, listId?: string, allowCache = true): Promise<IUserCustomActionInfo> {
    let restUrl = _getCustomActionsBaseRestUrl(siteUrl, { listId: listId, actionId: customActionId });
    let cacheOptions = allowCache === true ? shortLocalCache : { allowCache: false };
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        ...cacheOptions
    };
    try {
        let response = await GetJson<IUserCustomActionInfo>(restUrl, null, restOptions);
        if (!isNullOrUndefined(response)) {
            return _parseCustomActionReponse(response)
        }
    } catch {
    }

    return null;
}

/** Get UserCustomAction by name from web/list */
export async function GetUserCustomActionByName(siteUrl: string, name: string, listId?: string, allowCache = true): Promise<IUserCustomActionInfo[]> {
    let restUrl = `${_getCustomActionsBaseRestUrl(siteUrl, { listId: listId })}?$filter=Name eq '${encodeURIComponent(name)}'`;
    let cacheOptions = allowCache === true ? shortLocalCache : { allowCache: false };
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        ...cacheOptions
    };
    try {
        let response = await GetJson<{ value: IUserCustomActionInfo[]; }>(restUrl, null, restOptions);
        if (!isNullOrUndefined(response) && !isNullOrEmptyArray(response.value)) {
            return response.value.map(_parseCustomActionReponse);
        }
    } catch {
    }

    return [];
}

/** Add UserCustomAction to web/list */
export async function AddUserCustomAction(siteUrl: string, userCustomActionInfo: Omit<Partial<IUserCustomActionInfo>, "Id">, listId?: string): Promise<IUserCustomActionInfo> {
    let restUrl = _getCustomActionsBaseRestUrl(siteUrl, { listId: listId });
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        method: "POST",
        includeDigestInPost: true
    };

    try {
        let data = _convertCustomActionToPostData(userCustomActionInfo);

        let response = await GetJson<IUserCustomActionInfo>(restUrl, JSON.stringify(data), restOptions);
        if (!isNullOrUndefined(response)) {
            return _parseCustomActionReponse(response);
        }
    } catch {
    }

    return null;
}

/** Update UserCustomAction to web/list */
export async function UpdateUserCustomAction(siteUrl: string, customActionId: string, userCustomActionInfo: Omit<Partial<IUserCustomActionInfo>, "Id">, listId?: string): Promise<boolean> {
    let restUrl = _getCustomActionsBaseRestUrl(siteUrl, { listId: listId, actionId: customActionId });
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        method: "POST",
        xHttpMethod: "MERGE",
        includeDigestInPost: true
    };
    try {
        let data = _convertCustomActionToPostData(userCustomActionInfo);
        let result = await GetJson<{ "odata.null": boolean } | string>(restUrl, JSON.stringify(data), restOptions);
        return !isNullOrUndefined(result) && result["odata.null"] === true || isNullOrEmptyString(result);
    } catch {
    }

    return false;
}

/** Delete UserCustomAction from web/list */
export async function DeleteUserCustomAction(siteUrl: string, customActionId: string, listId?: string): Promise<boolean> {
    let restUrl = _getCustomActionsBaseRestUrl(siteUrl, { listId: listId, actionId: customActionId });
    let restOptions: IRestOptions = {
        jsonMetadata: jsonTypes.nometadata,
        method: "POST",
        xHttpMethod: "DELETE",
        includeDigestInPost: true
    };
    try {
        let result = await GetJson<{ "odata.null": boolean } | string>(restUrl, null, restOptions);
        return !isNullOrUndefined(result) && result["odata.null"] === true || isNullOrEmptyString(result);
    } catch {
    }
    return false;
}

/** Get web regional settings */
export async function GetRegionalSettings(siteUrl?: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/regionalSettings`;
    try {
        let result = await GetJson<IWebRegionalSettings>(restUrl, null, { ...mediumLocalCache, jsonMetadata: jsonTypes.nometadata });
        return result;
    } catch {
    }
    return null;
}

/** Get all web properties */
export async function GetAllWebProperties(siteUrl?: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/AllProperties`;
    try {
        let result = await GetJson<IDictionary<string>>(restUrl, null, { ...shortLocalCache, jsonMetadata: jsonTypes.nometadata });
        return result;
    } catch {
    }
    return null;
}

/** Get web property by name */
export async function GetWebPropertyByName(name: string, siteUrl?: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web/AllProperties?$select=${name}`;
    try {
        let result = await GetJson<IDictionary<string>>(restUrl, null, { ...shortLocalCache, jsonMetadata: jsonTypes.nometadata });
        if (!isNullOrUndefined(result) && !isNullOrUndefined(result[name])) {
            return result[name];
        }
    } catch {
    }
    return null;
}

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

export interface spfxContext { legacyPageContext: typeof _spPageContextInfo }
export function ensureLegacyProps(pageContext: spfxContext) {
    try {
        let isContextOk = (ctx: typeof _spPageContextInfo) => !isNullOrUndefined(ctx) && !isNullOrUndefined(ctx.webServerRelativeUrl);
        let getLegacyContext = (ctx: spfxContext) => !isNullOrUndefined(ctx) && !isNullOrUndefined(ctx.legacyPageContext) ? ctx.legacyPageContext : null;
        let getContext = (ctx: (typeof _spPageContextInfo) | spfxContext) => isContextOk(ctx as typeof _spPageContextInfo) ? ctx : getLegacyContext(ctx as spfxContext);

        if (isTypeofFullNameNullOrUndefined("_spPageContextInfo") || !isContextOk(_spPageContextInfo)) {
            logger.info(`_spPageContextInfo ${isTypeofFullNameNullOrUndefined("_spPageContextInfo") ? 'is missing' : 'is broken'}, wrapping with our property`);
            //bug in SPFx during inplace left navigation will put an SPFx object into this global. Correct it using the setter.
            let _currentContext = pageContext.legacyPageContext;
            Object.defineProperty(window, "_spPageContextInfo", {
                set: (newContext) => {
                    if (!isNullOrUndefined(newContext)) {
                        if (isContextOk(newContext)) {
                            logger.debug("Context ok");
                            _currentContext = newContext;
                        }
                        else {
                            let legacy = getLegacyContext(newContext);
                            if (!isNullOrUndefined(legacy)) {
                                logger.error("Context NOT ok - using legacy context");
                                _currentContext = legacy;
                            }
                            else logger.error("Context NOT ok - no legacy context either.");
                        }
                    }
                },
                get: () => getContext(_currentContext)
            });
        }
    } catch (ex) {
    }
}

export async function WebHasUniquePermissions(siteUrl: string): Promise<boolean> {
    let url = `${GetRestBaseUrl(siteUrl)}/web?$select=hasuniqueroleassignments`;
    let has = await GetJson<{ HasUniqueRoleAssignments: boolean }>(url, undefined, { allowCache: false, jsonMetadata: jsonTypes.nometadata });
    return has.HasUniqueRoleAssignments === true;
}
export async function RestoreWebPermissionInheritance(siteUrl: string): Promise<void> {
    let url = `${GetRestBaseUrl(siteUrl)}/web/ResetRoleInheritance`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function BreakWebPermissionInheritance(siteUrl: string, clear = true): Promise<void> {
    let url = `${GetRestBaseUrl(siteUrl)}/web/breakroleinheritance(copyRoleAssignments=${clear ? 'false' : 'true'}, clearSubscopes=true)`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function AssignWebPermission(siteUrl: string, principalId: number, roleId: number) {
    let url = `${GetRestBaseUrl(siteUrl)}/web/roleassignments/addroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function RemoveWebPermission(siteUrl: string, principalId: number, roleId: number) {
    let url = `${GetRestBaseUrl(siteUrl)}/web/roleassignments/removeroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}

/** set a user as site admin - rejects/throws if not successful */
export async function SetUserAsSiteAdmin(siteUrl: string, userId: number) {
    const url = `${GetRestBaseUrl(siteUrl)}/web/getuserbyid(${userId})`;
    await GetJson<{}>(url, jsonStringify({
        "__metadata": { "type": "SP.User" },
        "IsSiteAdmin": true
    }), { method: 'POST', xHttpMethod: 'MERGE' });
    return true;
}

/** get all the rentention labels (compliance tags) for a site */
export async function GetAvailableTagsForSite(siteUrlOrId: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        let url = `${siteUrl}_api/SP.CompliancePolicy.SPPolicyStoreProxy.GetAvailableTagsForSite(siteUrl=@a1)?@a1='${encodeURIComponent(makeFullUrl(siteUrl))}'`;
        let result = await GetJson<{ value: IRententionLabel[] }>(url, null, {
            jsonMetadata: jsonTypes.nometadata
        });
        return result.value;
    } catch {
        return [];
    }
}

/** get all the rentention labels (compliance tags) for a site */
export function GetAvailableTagsForSiteSync(siteUrlOrId: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    try {
        let url = `${siteUrl}_api/SP.CompliancePolicy.SPPolicyStoreProxy.GetAvailableTagsForSite(siteUrl=@a1)?@a1='${encodeURIComponent(makeFullUrl(siteUrl))}'`;
        let response = GetJsonSync<{ value: IRententionLabel[] }>(url, null, {
            jsonMetadata: jsonTypes.nometadata
        });
        return response.success ? response.result.value : [];
    } catch {
        return [];
    }
}

export async function GetActiveFeatures(siteUrlOrId: string, allowCache = true) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        let url = `${siteUrl}/_api/web/features?$select=DisplayName,DefinitionId`;
        let response = await GetJson<{ value: { DisplayName: string; DefinitionId: string; }[]; }>(url, null, {
            method: "GET",
            jsonMetadata: jsonTypes.nometadata,
            includeDigestInGet: true,
            ...(allowCache === true ? mediumLocalCache : noLocalCache)
        });
        return response.value;
    } catch {
    }
    return null;
}

export async function ActivateFeature(siteUrlOrId: string, id: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        id = normalizeGuid(id);
        let url = `${siteUrl}/_api/web/features/add('${id}')`;
        let response = await GetJson<{ DefinitionId: string; }>(url, null, {
            method: "POST",
            jsonMetadata: jsonTypes.nometadata,
            includeDigestInPost: true
        });
        return !isNullOrUndefined(response) && normalizeGuid(response.DefinitionId) === id;
    } catch {
    }
    return false;
}

export async function DectivateFeature(siteUrlOrId: string, id: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        id = normalizeGuid(id);
        let url = `${siteUrl}/_api/web/features/remove('${id}')`;
        let response = await GetJson<{ "odata.null": boolean }>(url, null, {
            method: "POST",
            jsonMetadata: jsonTypes.nometadata,
            includeDigestInPost: true
        });
        return !isNullOrUndefined(response) && response["odata.null"] === true;
    } catch {
    }
    return null;
}

export async function GetWelcomePage(siteUrlOrId: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        let url = `${siteUrl}/_api/web/rootFolder`;
        let response = await GetJson<IFolderInfo>(url, null, {
            method: "GET",
            jsonMetadata: jsonTypes.nometadata
        });
        if (!isNullOrUndefined(response) && response.Exists && !isNullOrEmptyString(response.WelcomePage)) {
            return response.WelcomePage;
        }
    } catch {
    }
    return null;
}

export async function SetWelcomePage(siteUrlOrId: string, welcomePage: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    try {
        let url = `${siteUrl}/_api/web/rootFolder`;
        let response = await GetJson<{ "odata.null": boolean } | string>(
            url,
            JSON.stringify({
                WelcomePage: welcomePage
            }),
            {
                method: "POST",
                xHttpMethod: "MERGE",
                jsonMetadata: jsonTypes.nometadata,
                includeDigestInPost: true
            });
        return !isNullOrUndefined(response) && response["odata.null"] === true || isNullOrEmptyString(response);
    } catch {
    }
    return false;
}
/** Get web associated groups */
export async function GetWebAssociatedGroups(siteUrl?: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let restUrl = `${GetRestBaseUrl(siteUrl)}/web?$select=AssociatedOwnerGroup,AssociatedMemberGroup,AssociatedVisitorGroup&$expand=AssociatedOwnerGroup,AssociatedMemberGroup,AssociatedVisitorGroup`;
    try {
        let result = await GetJson<{
            AssociatedMemberGroup: ISiteGroupInfo;
            AssociatedOwnerGroup: ISiteGroupInfo;
            AssociatedVisitorGroup: ISiteGroupInfo;
        }
        >(restUrl, null, { ...longLocalCache, jsonMetadata: jsonTypes.nometadata });
        return result;
    } catch {
    }
    return null;
}

// todo: Include the moment/moment-timezone library as a depondency so it can be imported and chunked using webpack to reduce
// bundled package size
if (typeof window !== "undefined") {
    MomentTimezoneJSKnownScript.load();
}