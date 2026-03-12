import { ILocalStorageCacheLifetime } from "./localstoragecache.types";

export type IRestResponseType = "" | "blob" | "arraybuffer" | "text" | "json" | "document";
// eslint-disable-next-line no-shadow
export enum jsonTypes {
    verbose = "application/json;odata=verbose",
    minimal = "application/json;odata=minimal",
    nometadata = "application/json;odata=nometadata",

    minimalV4 = "application/json;odata.metadata=minimal",
    noMetadataV4 = "application/json;odata.metadata=none",

    standard = "application/json"
}

// eslint-disable-next-line no-shadow
export enum contentTypes {
    xml = "application/xml",
    json = "application/json"
}

export const AllRestCacheOptionsKeys: Required<IRestCacheOptions> = {
    allowCache: true,
    forceCacheUpdate: true,
    localStorageExpiration: 1,
    maxAge: 1
};
export interface IRestCacheOptions {
    allowCache?: boolean;
    /** if allowCache=true and local storage is supported, this will keep the results in local storage for a while */
    localStorageExpiration?: number | ILocalStorageCacheLifetime | Date;
    /** max age the runtime memeroy cache result is valid for in seconds */
    maxAge?: number;
    /** when a request allows to be stored in cache (persistent/memory) - signals that we want to update the cached value */
    forceCacheUpdate?: boolean;
}

export interface IRestRequestOptions {
    /**
     * Request method.
     *
     * SharePoint typically uses `GET` or `POST`.
     * For SharePoint updates/deletes, use `POST` with `xHttpMethod`.
     *
     * Microsoft Graph uses the actual HTTP method directly.
     */
    method?: "GET" | "POST" | "MERGE" | "DELETE" | "PUT";

    /**
     * SharePoint-only method override.
     * Used with `method: "POST"` for `MERGE`, `DELETE`, or `PUT`.
     * Not used for Microsoft Graph.
     */
    xHttpMethod?: "MERGE" | "DELETE" | "PUT";

    /** default true */
    includeDigestInPost?: boolean;
    /** default false */
    includeDigestInGet?: boolean;
    /**default: Accept: jsonTypes.verbose, and (in post only) content-type: jsonTypes.verbose */
    headers?: {
        [key: string]: string;
        Accept?: string;
        "content-type"?: string;
        /** `Bearer ${token}` */
        Authorization?: string;
    };
    /** allow cache on post requests if you provide a unique key to identify and match */
    postCacheKey?: string;
    cors?: boolean;
    responseType?: IRestResponseType;
    /**If set to true, will return the xhr object itself (XMLHttpRequest) (does not support allowCache!) */
    returnXhrObject?: boolean;
    /** provide a SharePoint web URL, if running a SharePoint request. Will be used to get the right form digest if/when needed. */
    spWebUrl?: string;
    jsonMetadata?: jsonTypes;
}


export interface IRestOptions extends IRestRequestOptions, IRestCacheOptions {
}

export interface IRequestObjects {
    xhr: XMLHttpRequest;
    options: IRestRequestOptions;
    cacheOptions: IRestCacheOptions & { cacheKey?: string; };
}

export type IRequestBody = Document | Blob | BufferSource | FormData | URLSearchParams | string | null;//should be type XMLHttpRequestBodyInit, but some projects don't recognize it for some reason

export interface IJsonSyncResultBase<T> {
    status: number;
    errorData?: any;
    /** preserve original error message from failed cached result */
    errorMessage?: string;
    result?: T;
    success: boolean;
    cachedTime?: number;
}
export interface IJsonSyncResultSuccess<T> extends IJsonSyncResultBase<T> {
    result: T;
    success: true;
}
export interface IJsonSyncResultError<T> extends IJsonSyncResultBase<T> {
    errorData: any;
    /** preserve original error message from failed cached result */
    errorMessage: string;
    success: false;
}
export type IJsonSyncResult<T> = IJsonSyncResultSuccess<T> | IJsonSyncResultError<T>;

export interface IRestError {
    message: string;
    errorData?: any;
    xhr?: XMLHttpRequest;
}