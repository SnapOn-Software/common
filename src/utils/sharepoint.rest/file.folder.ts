import { jsonStringify } from "../../helpers/json";
import { GetError } from "../../helpers/objects";
import { isNotEmptyArray, isNotEmptyString, isNullOrEmptyString, isNullOrUndefined, isNumber, isNumeric, newGuid } from "../../helpers/typecheckers";
import { encodeURIComponentEX, makeServerRelativeUrl, normalizeUrl } from "../../helpers/url";
import { IDictionary } from "../../types/common.types";
import { IRequestBody, IRestOptions, IRestResponseType, jsonTypes } from "../../types/rest.types";
import { IFolderBasicInfo, IFolderInfo } from "../../types/sharepoint.types";
import { FileLevel, IFileInfoWithModerationStatus, ModerationStatus } from "../../types/sharepoint.utils.types";
import { ConsoleLogger } from "../consolelogger";
import { GetJson, GetJsonSync, longLocalCache, mediumLocalCache, noLocalCache, shortLocalCache } from "../rest";
import { GetRestBaseUrl, GetSiteUrl } from "./common";
import { GetListRestUrl } from "./list";
import { SPVersionToVersionId } from "./listutils/common";

const logger = ConsoleLogger.get("utils/sharepoint.rest/file.folder");

let existingFolders: string[] = [];

export async function EnsureFolderPath(siteUrl: string, folderServerRelativeUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    //issue 7176
    folderServerRelativeUrl = makeServerRelativeUrl(folderServerRelativeUrl, siteUrl);
    if (existingFolders.indexOf(folderServerRelativeUrl) >= 0) {
        return true;
    }

    let url = `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderServerRelativeUrl}')?$select=exists`;
    let folder = await GetJson<{ d: { Exists: boolean; }; }>(url, null, {
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    if (folder && folder.d.Exists) {
        existingFolders.push(folderServerRelativeUrl);
        return true;
    }
    else {
        let parts = folderServerRelativeUrl.split('/');
        if (parts.length > 1) {
            let parentFolder = parts.slice(0, parts.length - 1).join('/');

            //ensure parent
            let parent = await EnsureFolderPath(siteUrl, parentFolder);
            if (parent) {
                //create it
                let ensure = await EnsureFolder(siteUrl, parentFolder, parts[parts.length - 1]);
                if (ensure.Exists) {
                    existingFolders.push(folderServerRelativeUrl);
                    return true;
                }
            }
        }
    }
    return false;
}

export function EnsureFolderPathSync(siteUrl: string, folderServerRelativeUrl: string): boolean {
    siteUrl = GetSiteUrl(siteUrl);

    //issue 7176
    folderServerRelativeUrl = makeServerRelativeUrl(folderServerRelativeUrl, siteUrl);
    if (existingFolders.indexOf(folderServerRelativeUrl) >= 0) {
        return true;
    }

    let url = `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderServerRelativeUrl}')?$select=exists`;
    let response = GetJsonSync<{ d: { Exists: boolean; }; }>(url, null, {
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    if (!isNullOrUndefined(response)
        && !isNullOrUndefined(response.result)
        && !isNullOrUndefined(response.result.d)
        && response.result.d.Exists === true) {
        existingFolders.push(folderServerRelativeUrl);
        return true;
    } else {
        let parts = folderServerRelativeUrl.split('/');
        if (parts.length > 1) {
            let parentFolder = parts.slice(0, parts.length - 1).join('/');

            //ensure parent
            let parent = EnsureFolderPathSync(siteUrl, parentFolder);
            if (parent) {
                //create it
                let ensure = EnsureFolderSync(siteUrl, parentFolder, parts[parts.length - 1]);
                if (ensure.Exists) {
                    existingFolders.push(folderServerRelativeUrl);
                    return true;
                }
            }
        }
    }
    return false;
}

export function EnsureFolder(siteUrl: string, parentFolderServerRelativeUrl: string, folderName: string): Promise<{ Exists: boolean; ServerRelativeUrl?: string; }> {
    siteUrl = GetSiteUrl(siteUrl);

    parentFolderServerRelativeUrl = makeServerRelativeUrl(parentFolderServerRelativeUrl, siteUrl);

    return GetJson<{ d: { Exists: boolean; ServerRelativeUrl: string; }; }>(`${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${parentFolderServerRelativeUrl}')/folders/add(url='${folderName}')`, null, { method: "POST", spWebUrl: siteUrl })
        .then(r => { return r.d; })
        .catch<{ Exists: boolean; ServerRelativeUrl?: string; }>(() => { return { Exists: false }; });
}

export function EnsureFolderSync(siteUrl: string, parentFolderServerRelativeUrl: string, folderName: string): { Exists: boolean; ServerRelativeUrl?: string; } {
    siteUrl = GetSiteUrl(siteUrl);

    parentFolderServerRelativeUrl = makeServerRelativeUrl(parentFolderServerRelativeUrl, siteUrl);

    let response = GetJsonSync<{ d: { Exists: boolean; ServerRelativeUrl: string; }; }>(`${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${parentFolderServerRelativeUrl}')/folders/add(url='${folderName}')`, null, { method: "POST", spWebUrl: siteUrl })

    if (!isNullOrUndefined(response)
        && !isNullOrUndefined(response.result)
        && !isNullOrUndefined(response.result.d)) {
        return response.result.d;
    }
    return { Exists: false };
}

export function DeleteFolder(siteUrl: string, folderUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);
    folderUrl = makeServerRelativeUrl(folderUrl, siteUrl);
    var requestUrl = `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderUrl}')`;

    return GetJson(requestUrl, null, {
        method: "POST",
        xHttpMethod: "DELETE",
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    })
        .then(r => true)
        .catch<boolean>((e) => false);
}

export function GetFolderFiles(siteUrl: string, folderUrl: string): Promise<IFileInfoWithModerationStatus[]> {
    siteUrl = GetSiteUrl(siteUrl);
    folderUrl = makeServerRelativeUrl(folderUrl, siteUrl);
    var requestUrl = `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderUrl}')`
        + `/files?$select=Level,Exists,Name,ServerRelativeUrl,Title,TimeCreated,TimeLastModified,ListItemAllFields/OData__ModerationStatus&$expand=ListItemAllFields`;

    return GetJson<{ d: { results: IFileInfoWithModerationStatus[]; }; }>(requestUrl, null, {
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    }).then(r => {
        return r.d && r.d.results || [];
    }).catch<IFileInfoWithModerationStatus[]>(() => {
        return [];
    });
}

export function UploadFileSync(siteUrl: string, folderServerRelativeUrl: string, fileName: string, fileContent: IRequestBody): {
    Exists: boolean;
    ServerRelativeUrl?: string;
    ListItemAllFields?: { [fieldInternalName: string]: any; };
} {
    siteUrl = GetSiteUrl(siteUrl);

    folderServerRelativeUrl = makeServerRelativeUrl(folderServerRelativeUrl, siteUrl);

    let res = GetJsonSync<{ d: { Exists: boolean; ServerRelativeUrl: string; }; }>(
        `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderServerRelativeUrl}')/files/add(url='${fileName}',overwrite=true)?$expand=ListItemAllFields`,
        fileContent, {
        method: 'POST',
        spWebUrl: siteUrl
    });

    return res.success && res.result && res.result.d ? res.result.d : { Exists: false };
}

export async function UploadFile(siteUrl: string, folderServerRelativeUrl: string, fileName: string, fileContent: IRequestBody,
    /** default options: { overwrite: true } */
    options?: {
        overwrite?: boolean;
        /** set to true to automatically find the next available file name. uploading file.ext to a folder that has that file will upload a file named file.1.ext instead */
        autoRename?: boolean;
    }): Promise<{
        Exists: boolean;
        ServerRelativeUrl?: string;
        [fieldInternalName: string]: any;
    }> {
    siteUrl = GetSiteUrl(siteUrl);

    options = options || { overwrite: true };

    folderServerRelativeUrl = makeServerRelativeUrl(folderServerRelativeUrl, siteUrl);

    if (options && options.autoRename) {
        //get all files from this folder and find the next available name
        let files = await GetFolderFiles(siteUrl, folderServerRelativeUrl);
        let fileNames = files.map(f => f.Name.toLowerCase());
        let counter = 0;
        let originalName = fileName.split('.');
        originalName.splice(originalName.length - 1, 0, counter.toString());
        while (fileNames.includes(fileName.toLowerCase())) {
            counter++;
            originalName[originalName.length - 2] = counter.toString();
            fileName = originalName.join('.');
        }
    }

    return GetJson<{ d: { Exists: boolean; ServerRelativeUrl: string; }; }>(
        `${GetRestBaseUrl(siteUrl)}/Web/getFolderByServerRelativeUrl(serverRelativeUrl='${folderServerRelativeUrl}')/files/add(url='${fileName}'${options.overwrite ? ',overwrite=true' : ''})?$expand=ListItemAllFields`,
        fileContent, {
        method: 'POST',
        spWebUrl: siteUrl,
        allowCache: false,
        postCacheKey: null
    })//Issue 6657 force set "POST" since we might send empty string as the value
        .then(r => { return r.d; })
        .catch<{
            Exists: boolean;
            ServerRelativeUrl?: string;
            [fieldInternalName: string]: any;
        }>(() => { return { Exists: false }; });
}

export async function PublishFile(siteUrl: string, fileUrl: string, comment: string = "") {
    let result = await _moderateFile(siteUrl, fileUrl, "publish", comment);
    return result;
}

export async function UnpublishFile(siteUrl: string, fileUrl: string, comment: string = "") {
    let result = await _moderateFile(siteUrl, fileUrl, "unpublish", comment);
    return result;
}

export async function ApproveFile(siteUrl: string, fileUrl: string, comment: string = "") {
    siteUrl = GetSiteUrl(siteUrl);
    let result = await _moderateFile(siteUrl, fileUrl, "approve", comment);
    return result;
}

export async function RejectFile(siteUrl: string, fileUrl: string, comment: string = "") {
    let result = await _moderateFile(siteUrl, fileUrl, "deny", comment);
    return result;
}

async function _moderateFile(siteUrl: string, fileUrl: string, action: "publish" | "unpublish" | "approve" | "deny", comment: string = "") {
    siteUrl = GetSiteUrl(siteUrl);
    let fileServerRelativeUrl = makeServerRelativeUrl(fileUrl, siteUrl);
    try {
        let hasComments = !isNullOrEmptyString(comment);
        let publishUrl = `${GetRestBaseUrl(siteUrl)}/Web/getFileByServerRelativeUrl('${fileServerRelativeUrl}')/${action}${hasComments ? `(@a1)?@a1=%27${encodeURIComponentEX(comment, { singleQuoteMultiplier: 2 })}%27` : '()'}`;
        let publishResult = await GetJson<{ "odata.null": boolean }>(publishUrl, null, {
            method: "POST",
            jsonMetadata: jsonTypes.nometadata,
            includeDigestInPost: true,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        return !isNullOrUndefined(publishResult) && publishResult["odata.null"] === true;
    } catch {
    }
    return false;
}

export function RecycleFile(siteUrl: string, fileServerRelativeUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl) + "/recycle()";

    return GetJson(fileRestUrl, null, {
        method: "POST",
        headers: {
            "IF-MATCH": "*"
        },
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    })
        .then(r => true)
        .catch<boolean>((e) => false);
}

export function DeleteFile(siteUrl: string, fileServerRelativeUrl: string): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl);

    return GetJson(fileRestUrl, null, {
        method: "POST",
        xHttpMethod: "DELETE",
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    })
        .then(r => true)
        .catch<boolean>((e) => false);
}

/** get the REST url for the site/_api/web/getfile....() */
function GetFileRestUrl(siteUrl: string, fileServerRelativeUrl: string) {
    fileServerRelativeUrl = makeServerRelativeUrl(fileServerRelativeUrl, siteUrl);
    let fileRestUrl = `${GetRestBaseUrl(siteUrl)}/Web/getFileByServerRelativeUrl('${fileServerRelativeUrl}')`;
    return fileRestUrl;
}

export function GetFileSync<T>(siteUrl: string, fileServerRelativeUrl: string, responseType?: IRestResponseType, options?: {
    /** default, short cache. */
    cache?: "long" | "short" | "nocache";
}): { Exists: boolean; Content?: T; } {
    siteUrl = GetSiteUrl(siteUrl);

    let restOptions: IRestOptions = isNullOrUndefined(options) || options.cache !== "long"
        ? { ...shortLocalCache }
        : { ...longLocalCache };

    if (options && options.cache === "nocache")
        restOptions.forceCacheUpdate = true;

    if (!isNullOrUndefined(responseType)) {
        restOptions.responseType = responseType;
    }

    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl);
    if (!restOptions.forceCacheUpdate && reloadCacheFileModifiedRecently(siteUrl, fileServerRelativeUrl)) {
        restOptions.forceCacheUpdate = true;
    }

    restOptions.spWebUrl = siteUrl;//allow getDigest to work when not in SharePoint

    let response = GetJsonSync<T>(`${fileRestUrl}/$value`, null, restOptions);
    if (response && response.success)
        return {
            Exists: true,
            Content: response.result
        };
    else
        return {
            Exists: false
        };
}

/** @deprecated use GetFileEx */
export function GetFile<T>(siteUrl: string, fileServerRelativeUrl: string, allowCache?: boolean, responseType?: IRestResponseType): Promise<{ Exists: boolean; Content?: T; }> {
    return GetFileEx(siteUrl, fileServerRelativeUrl, { allowCache, responseType });
}

export async function GetFileEx<T>(siteUrl: string, fileServerRelativeUrl: string, options?: {
    allowCache?: boolean; responseType?: IRestResponseType;
    /** version #.# or version ID as number */
    version?: string | number;
}): Promise<{ Exists: boolean; Content?: T; }> {
    siteUrl = GetSiteUrl(siteUrl);

    options = options || {};

    let restOptions: IRestOptions = { ...(options.allowCache === true ? shortLocalCache : noLocalCache), forceCacheUpdate: options.allowCache !== true };
    if (!isNullOrUndefined(options.responseType)) {
        restOptions.responseType = options.responseType;
    }

    let version = options.version;
    let versionPart = "";
    if (isNumber(version) && version > 0 || isNotEmptyString(version)) {
        //this end point does not work on MSAL claims
        // //get content of specific version
        // let fileSiteRelativeUrl = fileServerRelativeUrl.slice(siteUrl.length - 1);
        // let versionUrl = `${siteUrl}_vti_history/${FileVersionToVersionId(options.version)}${fileSiteRelativeUrl}`;
        // try {
        //     restOptions.jsonMetadata = jsonTypes.nometadata;
        //     let versionContent = await GetJson<T>(versionUrl, undefined, restOptions);
        //     return { Exists: isString(versionContent), Content: versionContent };
        // } catch (e) {
        //     return { Exists: false };
        // }
        versionPart = `/versions(${SPVersionToVersionId(options.version)})/`;
    }

    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl);
    if (!restOptions.forceCacheUpdate && reloadCacheFileModifiedRecently(siteUrl, fileServerRelativeUrl)) {
        restOptions.forceCacheUpdate = true;
    }

    restOptions.spWebUrl = siteUrl;//allow getDigest to work when not in SharePoint

    return GetJson<T>(`${fileRestUrl}${versionPart}/$value`, null, restOptions).then(r => {
        return {
            Exists: true,
            Content: r
        };
    }).catch<{ Exists: boolean; Content?: T; }>(() => {
        return {
            Exists: false
        };
    });
}

export interface iFileVersionInfo {
    CheckInComment: string;
    Created: Date;
    /** version ID: major*512 + minor */
    ID: number;
    IsCurrentVersion: boolean;
    Length: string;
    Size: number;
    /** site relative _vti_history link. Better use /getFile..../versions(id)/$value */
    Url: string;
    /** version format #.# */
    VersionLabel: string;
}
/** get file version history olders version first with correct check in comment, does NOT include current version */
export async function GetFileVersionHistory(siteUrl: string, fileServerRelativeUrl: string, options?: {
    refreshCache?: boolean;
}): Promise<iFileVersionInfo[]> {
    siteUrl = GetSiteUrl(siteUrl);

    options = options || {};

    let restOptions: IRestOptions = {
        allowCache: options.refreshCache !== true,
        jsonMetadata: jsonTypes.nometadata
    };

    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl);
    if (!restOptions.forceCacheUpdate && reloadCacheFileModifiedRecently(siteUrl, fileServerRelativeUrl)) {
        restOptions.forceCacheUpdate = true;
    }

    restOptions.spWebUrl = siteUrl;//allow getDigest to work when not in SharePoint

    try {
        const result = await GetJson<{ value: iFileVersionInfo[] }>(`${fileRestUrl}/versions`, null, restOptions);
        //Created will come in as string
        result.value.forEach(v => v.Created = new Date(v.Created as any as string));
        return result.value;
    }
    catch (e) {
        logger.error(GetError(e));
    }
}

/** @deprecated use SPVersionToVersionId instead -- version: 1.5 >> version ID for history */
export function FileVersionToVersionId(version: string | number) {
    return SPVersionToVersionId(version);
}

var $reloadCacheFileModifiedRecentlyFlagged: string[] = [];
function reloadCacheFileModifiedRecently(siteUrl: string, fileServerRelativeUrl: string) {
    let fileRestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrl);
    let key = fileRestUrl.toLowerCase();

    //only flag it once, first time it is requested...
    if (!$reloadCacheFileModifiedRecentlyFlagged.includes(key)) {
        try {
            $reloadCacheFileModifiedRecentlyFlagged.push(key);

            let fileInfo = GetJsonSync<{ TimeLastModified: string; }>(`${fileRestUrl}?$select=TimeLastModified`,
                null, {
                allowCache: true,//only allow in-memory cache for this
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });
            if (fileInfo.success && fileInfo.result) {
                let modified = new Date(fileInfo.result.TimeLastModified);
                let now = new Date();
                let difference = now.getTime() - modified.getTime();
                if (difference < 5 * 60 * 1000) {
                    //file has changed in the past 5 minutes - do not allow cache on it.
                    //happens when user uses classic app to change settings, the clear cache does not clear it on the main
                    //site URL ( support case - Issue 778 780 & 782 )
                    return true;
                }
            }
        } catch (e) { }
    }

    return false;
}

/** Get file size (bytes) by file server relative url - can also get this by selecting FileSizeDisplay field on the item */
export async function GetFileSize(siteUrl: string, fileServerRelativeUrl: string, allowCache?: boolean);
/** Get file size (bytes) by list item - can also get this by selecting FileSizeDisplay field on the item */
export async function GetFileSize(siteUrl: string, listId: string, itemId: number, allowCache?: boolean);
export async function GetFileSize(siteUrl: string, fileServerRelativeUrlOrListId: string, itemIdOrAllowCache?: number | boolean, allowCache?: boolean): Promise<number> {
    siteUrl = GetSiteUrl(siteUrl);

    let requestUrl = "";
    if (isNumber(itemIdOrAllowCache) || isNumeric(itemIdOrAllowCache)) {
        requestUrl = GetListRestUrl(siteUrl, fileServerRelativeUrlOrListId) + `/items(${itemIdOrAllowCache})/File`;
    }
    else {
        allowCache = itemIdOrAllowCache === true;
        requestUrl = GetFileRestUrl(siteUrl, fileServerRelativeUrlOrListId);
    }
    let options: IRestOptions = {
        allowCache: allowCache === true, jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    };

    try {
        let result = await GetJson<{ vti_x005f_filesize: number; }>(`${requestUrl}/Properties?$select=vti_x005f_filesize`, null, options);
        return result.vti_x005f_filesize;
    } catch (e) {
        return null;
    }
}

export async function GetListFolders(siteUrl: string, listIdOrTitle: string): Promise<IFolderBasicInfo[]> {
    siteUrl = GetSiteUrl(siteUrl);

    //switched to get request with no meta data - much faster.
    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items?$Select=Folder/ServerRelativeUrl,Folder/Name&$filter=FSObjType eq 1&$expand=Folder`;

    let results: IFolderBasicInfo[] = [];
    try {
        let requestResult = (await GetJson<{
            value: { Folder: IFolderBasicInfo; }[];
        }>(url, null, {
            allowCache: true, jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        }));

        if (isNotEmptyArray(requestResult && requestResult.value)) {
            results = requestResult.value.map(f => ({
                Name: f.Folder.Name,
                ServerRelativeUrl: normalizeUrl(f.Folder.ServerRelativeUrl)
            }));
        }
    } catch (e) {
        //Issue 7543 throttled library with lots of items will fail so return empty array
        logger.error(`Could not get folders from ${listIdOrTitle}, check network for more infromation.`);
    }

    return results;
}

export async function GetFolder(siteUrl: string, folderUrl: string, options: { allowCache?: boolean, includeFolders?: boolean, includeFiles?: boolean } = {}) {
    options = { includeFiles: false, includeFolders: false, allowCache: true, ...options };
    siteUrl = GetSiteUrl(siteUrl);
    try {
        let folderServerRelativeUrl = makeServerRelativeUrl(folderUrl, siteUrl);
        let restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFolderByServerRelativeUrl('${encodeURIComponentEX(folderServerRelativeUrl)}')`;

        if (options.includeFiles === true || options.includeFolders === true) {
            let expand = [];
            if (options.includeFiles) {
                expand.push("Files");
            }
            if (options.includeFolders) {
                expand.push("Folders");
            }

            restUrl += `?$expand=${expand.join(",")}`;
        }

        const result = await GetJson<IFolderInfo>(
            restUrl,
            null,
            {
                ...(options.allowCache ? mediumLocalCache : noLocalCache),
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });
        return result;
    } catch {
    }
    return null;
}

export async function GetFileItemId(siteUrl: string, fileServerRelativeUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);
    const restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFileByServerRelativeUrl('${encodeURIComponentEX(fileServerRelativeUrl)}')/ListItemAllFields/id`;
    const result = await GetJson<{ value: number; }>(restUrl, null, {
        jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    return result.value;
}

export async function GetFileModerationStatus(siteUrl: string, fileServerRelativeUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);
    const restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFileByServerRelativeUrl('${encodeURIComponentEX(fileServerRelativeUrl)}')/ListItemAllFields/OData__ModerationStatus`;
    const result = await GetJson<{ value: ModerationStatus; }>(restUrl, null, {
        jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    return result.value;
}

export async function GetFilePublishingStatus(siteUrl: string, fileServerRelativeUrl: string) {
    siteUrl = GetSiteUrl(siteUrl);
    const restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFileByServerRelativeUrl('${encodeURIComponentEX(fileServerRelativeUrl)}')/level`;
    const result = await GetJson<{ value: FileLevel; }>(restUrl, null, {
        jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    return result.value;
}

export async function GetFileItemInfo(siteUrl: string, fileServerRelativeUrl: string): Promise<{ listId: string; itemId: number; }> {
    try {
        siteUrl = GetSiteUrl(siteUrl);
        const restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFileByServerRelativeUrl('${encodeURIComponentEX(fileServerRelativeUrl)}')/ListItemAllFields`;
        const result = await GetJson<{
            d: {
                __metadata: {
                    //returns something like this:
                    uri: string;//"https://x.sharepoint.com/sites/xxx/_api/Web/Lists(guid'6f743572-6620-40e3-b2dd-c8099e73e9c8')/Items(11)"
                },
                Id: number;
            }
        }>(restUrl, null, {
            jsonMetadata: jsonTypes.verbose,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

        const itemId = result.d.Id;
        const listId = result.d.__metadata.uri.split("'")[1];

        return { listId, itemId };
    }
    catch (e) {
        return null;
    }
}

export async function GetFolderItemInfo(siteUrl: string, folderServerRelativeUrl: string): Promise<{ listId: string; itemId: number; }> {
    try {
        siteUrl = GetSiteUrl(siteUrl);
        const restUrl = `${GetRestBaseUrl(siteUrl)}/web/getFolderByServerRelativeUrl('${encodeURIComponentEX(folderServerRelativeUrl)}')/ListItemAllFields`;
        const result = await GetJson<{
            d: {
                __metadata: {
                    //returns something like this:
                    uri: string;//"https://x.sharepoint.com/sites/xxx/_api/Web/Lists(guid'6f743572-6620-40e3-b2dd-c8099e73e9c8')/Items(11)"
                },
                Id: number;
            }
        }>(restUrl, null, {
            jsonMetadata: jsonTypes.verbose,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

        const itemId = result.d.Id;
        const listId = result.d.__metadata.uri.split("'")[1];

        return { listId, itemId };
    }
    catch (e) { return null; }
}

interface iWebPartPageProps {
    /** webpart id */
    id: string;
    /** unique instance id - random guid, or blank to auto-generate */
    instanceId?: string;
    title: string;
    description: string;
    dataVersion?: "1.0";
    properties: IDictionary<string | boolean>
}
interface iWebPartPageResult {
    /** site relative random page name, such as: "SitePages/y2k9xm8v.aspx" */
    value: string;
}
/** Creates a modern single app page and return its URL. if a file in that name exists, it will return one with (1) appended to it. */
export async function CreateAppPage(siteUrl: string, info: {
    /** file name, without extension */
    name: string; webPartDataAsJson: iWebPartPageProps
}) {
    //read more: 
    //https://petelus.sharepoint.com/sites/CMSTest/_api/SitePages/Pages/CreateAppPage
    //https://spblog.net/post/2019/03/05/what-s-new-and-what-s-changed-in-sharepoint-online-rest-api-in-january-february-2019

    function getFileServerRelativeUrl(siteRelative: string) {
        const fileRelativeUrl = makeServerRelativeUrl(`${siteUrl}${siteRelative}`);
        return fileRelativeUrl;
    }

    let webPartDataAsJson = info.webPartDataAsJson;
    if (isNullOrEmptyString(webPartDataAsJson.instanceId))
        webPartDataAsJson.instanceId = newGuid();
    if (isNullOrEmptyString(webPartDataAsJson.dataVersion))
        webPartDataAsJson.dataVersion = "1.0";

    return logger.groupAsync("CreateAppPage", async log => {
        siteUrl = GetSiteUrl(siteUrl);
        const restUrl = `${GetRestBaseUrl(siteUrl)}/SitePages/Pages/CreateAppPage`;
        const result = await GetJson<iWebPartPageResult>(restUrl, jsonStringify({
            webPartDataAsJson: jsonStringify(webPartDataAsJson)
        }), {
            method: 'POST', jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        log(`created page`);
        log(jsonStringify(result));

        let fileRelativeUrl = getFileServerRelativeUrl(result.value);

        const fileId = await GetFileItemId(siteUrl, fileRelativeUrl);
        const updateRestUrl = `${GetRestBaseUrl(siteUrl)}/SitePages/Pages/UpdateAppPage`;
        const updateResult = await GetJson<iWebPartPageResult>(updateRestUrl, jsonStringify({
            pageId: fileId,
            title: info.name,
            webPartDataAsJson: jsonStringify(webPartDataAsJson)
        }), {
            method: 'POST', jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

        log(`updated page`);
        log(jsonStringify(updateResult));

        fileRelativeUrl = getFileServerRelativeUrl(updateResult.value);

        return fileRelativeUrl;
    });
}

/** Move a file to a new name/url, this API allows for changing file extension as well */
export async function MoveFile(siteUrl: string, currentServerRelativeUrl: string, targetServerRelativeUrl: string, options?: {
    overwrite?: boolean;
    /** set to true to automatically find the next available file name. uploading file.ext to a folder that has that file will upload a file named file.1.ext instead */
    autoRename?: boolean;
}) {
    return CopyOrMoveFile(siteUrl, currentServerRelativeUrl, targetServerRelativeUrl, "move", options);
    //this does NOT allow to change the file extension. only file name.
    // return UpdateItem(siteUrl, listIdOrTitle, itemId, {
    //     FileLeafRef: newFileName "hello.txt" >> "hello.md" won't work.
    // });
}

/** Copy a file to a new name/url, this API allows for changing file extension as well */
export async function CopyFile(siteUrl: string, currentServerRelativeUrl: string, targetServerRelativeUrl: string, options?: {
    overwrite?: boolean;
    /** set to true to automatically find the next available file name. uploading file.ext to a folder that has that file will upload a file named file.1.ext instead */
    autoRename?: boolean;
}) {
    return CopyOrMoveFile(siteUrl, currentServerRelativeUrl, targetServerRelativeUrl, "copy", options);
}

async function CopyOrMoveFile(siteUrl: string, currentServerRelativeUrl: string, targetServerRelativeUrl: string, action: "copy" | "move", options?: {
    overwrite?: boolean;
    /** set to true to automatically find the next available file name. uploading file.ext to a folder that has that file will upload a file named file.1.ext instead */
    autoRename?: boolean;
}) {
    try {

        if (options && options.autoRename) {
            let targetParts = targetServerRelativeUrl.split('/');
            let fileName = targetParts.pop();
            let targetFolderUrl = targetParts.join('/');
            //get all files from this folder and find the next available name
            let files = await GetFolderFiles(siteUrl, targetFolderUrl);
            let fileNames = files.map(f => f.Name.toLowerCase());
            let counter = 0;
            let originalName = fileName.split('.');
            originalName.splice(originalName.length - 1, 0, counter.toString());
            while (fileNames.includes(fileName.toLowerCase())) {
                counter++;
                originalName[originalName.length - 2] = counter.toString();
                fileName = originalName.join('.');
            }
            targetServerRelativeUrl = `${targetFolderUrl}/${fileName}`;
        }

        let url = `${GetRestBaseUrl(siteUrl)}/web/getfilebyserverrelativeurl('${currentServerRelativeUrl}')/`
        if (action === "copy") {
            url += `copyto(strNewUrl='${targetServerRelativeUrl}',bOverwrite=${options && options.overwrite ? "true" : "false"})`;
        } else {
            url += `moveto(newurl='${targetServerRelativeUrl}',flags=${options && options.overwrite ? 1 : 0})`;
        }

        let result = await GetJson(url, undefined, {
            method: "POST",
            jsonMetadata: jsonTypes.nometadata,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        logger.json(result, "CopyOrMoveFile");
        return true;
    } catch (e) {
        logger.json(e, "CopyOrMoveFile");
        return false;
    }
    //this does NOT allow to change the file extension. only file name.
    // return UpdateItem(siteUrl, listIdOrTitle, itemId, {
    //     FileLeafRef: newFileName "hello.txt" >> "hello.md" won't work.
    // });
}
