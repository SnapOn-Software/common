import { jsonParse } from "../helpers/json";
import { assign, getGlobal, hasOwnProperty, jsonClone } from "../helpers/objects";
import { isNullOrEmptyString, isNullOrUndefined, isNumber, isObject, isPrimitiveValue, isString } from "../helpers/typecheckers";
import { IDictionary } from "../types/common.types";
import { AllRestCacheOptionsKeys, IJsonSyncResult, IRequestBody, IRequestObjects, IRestCacheOptions, IRestError, IRestOptions, IRestRequestOptions, jsonTypes } from "../types/rest.types";
import { ConsoleLogger } from "./consolelogger";
import { getCacheItem, setCacheItem } from "./localstoragecache";
import { getFormDigest } from "./sharepoint.rest/web";

var logger = ConsoleLogger.get("utils/rest");

const supressDebugMessages = true;

/** cache for 1 day */
export const noLocalCache: IRestOptions = { allowCache: false };
/** cache for 1 days */
export const longLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 1 } };
/** cache for 2 days */
export const extraLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 2 } };
/** cache for 7 days */
export const weeekLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 7 } };
/** cache for 30 days */
export const monthLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 30 } };
/** cache for 5 minutes */
export const shortLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { minutes: 5 } };
/** cache for 15 minutes */
export const mediumLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { minutes: 15 } };

interface IPendingRequest<T> {
    objects: IRequestObjects;
    /**the main promise */
    promise: Promise<T>;
    /**additional listeners
     * must add a separate promise, so that I can make a full(not shallow) copy of the result.
     * this way if the first caller changes the object, the second caller gets it unchanged.
     */
    listeners: {
        resolve: (result: T) => void;
        reject: (reason: any) => void;
    }[];
}

//if allowCache is true, results will be stored/returned from here
function _getCachedResults() {
    var _cachedResults = getGlobal<{ [key: string]: IJsonSyncResult<any>; }>("utils_restmodule_cachedResults");
    return _cachedResults;
}

//cannot use from top window, example: DVP, if you open view item popup and close it too fast, there might be a pending request that never resolves since the handler code was unloaded from the window.
function _getPendingRequests() {
    var _pendingRequests = getGlobal<IDictionary<IPendingRequest<any>>>("utils_restmodule_pendingRequests", undefined, true);
    return _pendingRequests;
}


function getDefaultOptions(): IRestOptions {
    return {
        includeDigestInPost: true,
        headers: {
        }
    };
}

function fillHeaders(xhr: XMLHttpRequest, headers: { [key: string]: string; }) {
    for (let header in headers)
        if (hasOwnProperty(headers, header)) {
            let val = headers[header];
            if (!isNullOrEmptyString(val))
                xhr.setRequestHeader(header, val);
        }
}

/**
 * Depending on async:
 * - Returns an XMLHttpRequest that was opened asynchronously (needs to have event listeners set up before .send()) or
 * - Returns an XMLHttpRequest that was opened synchronously (will block on .send())
 */
function getXhr(url: string, body?: IRequestBody, options?: IRestOptions, async?: true): Promise<IRequestObjects>
function getXhr(url: string, body?: IRequestBody, options?: IRestOptions, async?: false): IRequestObjects
function getXhr(url: string, body?: IRequestBody, options?: IRestOptions, async: boolean = false): IRequestObjects | Promise<IRequestObjects> {

    let [myOptions, myCacheOptions] = configureXhrHeaders(url, body, options);

    const xhr: XMLHttpRequest = new XMLHttpRequest();
    xhr.open(myOptions.method, url, async);

    fillHeaders(xhr, myOptions.headers);

    if (myOptions.cors) {
        xhr.withCredentials = true;
    }

    if (!isNullOrEmptyString(myOptions.responseType) && myOptions.responseType !== "text") {
        if (myCacheOptions.allowCache === true &&
            (myOptions.responseType === "blob" || myOptions.responseType === "arraybuffer" || myOptions.responseType === "document")) {
            logger.warn("When allowCache is true, Blob, ArrayBuffer and Document response types will only be stored in runtime memory and not committed to local storage.");
        }
        xhr.responseType = myOptions.responseType;
    }

    const needsDigest =
        (myOptions.method === "GET" && myOptions.includeDigestInGet) ||
        (myOptions.method === "POST" && myOptions.includeDigestInPost);

    const applyDigest = (digest: string | null) => {
        if (digest) {
            xhr.setRequestHeader("X-RequestDigest", digest);
        } else {
            console.warn("X-RequestDigest header not set due to getFormDigest returning null");
        }
    }

    const result: IRequestObjects = { xhr, options: myOptions, cacheOptions: myCacheOptions };

    if (needsDigest && async) {
        return getFormDigest(myOptions.spWebUrl, true).then(digest => {
            applyDigest(digest);
            return result;
        })
    } else if (needsDigest && !async) {
        const digest = getFormDigest(myOptions.spWebUrl, false);
        applyDigest(digest);
        return result;
    }

    return result;
}

function configureXhrHeaders(url: string, body?: IRequestBody, options?: IRestOptions): [IRestRequestOptions, IRestCacheOptions & { cacheKey?: string; }] {
    var optionsWithDefaults = assign<IRestOptions>({}, getDefaultOptions(), options);
    let myCacheOptions: IRestCacheOptions & { cacheKey?: string; } = {};
    Object.keys(AllRestCacheOptionsKeys).forEach(key => {
        if (hasOwnProperty(optionsWithDefaults, key)) {
            myCacheOptions[key] = optionsWithDefaults[key];
            delete optionsWithDefaults[key];
        }
    });
    let myOptions: IRestRequestOptions = { ...optionsWithDefaults };

    let jsonType = myOptions.jsonMetadata || jsonTypes.verbose;

    if (isNullOrUndefined(myOptions.headers)) myOptions.headers = {};//issue 660 in case the sender sent headers as null
    if (isNullOrUndefined(myOptions.headers["Accept"])) {
        myOptions.headers["Accept"] = jsonType;
    }

    if (isNullOrEmptyString(myOptions.method)) {
        myOptions.method = isNullOrUndefined(body) ? "GET" : "POST";
    }

    if (myOptions.method === "POST" && isNullOrUndefined(myOptions.headers["content-type"])) {
        myOptions.headers["content-type"] = jsonType;
    }

    if (!isNullOrEmptyString(myOptions.xHttpMethod)) {
        myOptions.headers["X-HTTP-Method"] = myOptions.xHttpMethod;

        if (myOptions.xHttpMethod === "MERGE" || myOptions.xHttpMethod === "DELETE" || myOptions.xHttpMethod === "PUT") {
            myOptions.headers["If-Match"] = "*";// update regadless of other user changes
        }
    }

    //we do not support cache if there is a request body
    //postCacheKey - allow cache on post request for stuff like get item by CamlQuery
    if (isNullOrUndefined(body) || !isNullOrEmptyString(myOptions.postCacheKey)) {
        myCacheOptions.cacheKey = (url + '|' + JSON.stringify(myOptions)).trim().toLowerCase();
    }

    return [myOptions, myCacheOptions];
}

function getCachedResult<T>(objects: IRequestObjects): IJsonSyncResult<T> {
    var cacheKey = objects.cacheOptions.cacheKey;
    if (objects.cacheOptions.allowCache === true && objects.cacheOptions.forceCacheUpdate !== true) {
        if (isNullOrEmptyString(cacheKey)) {
            //logger.warn('cache is not supported for this type of request.');
            return null;
        }

        let _cachedResults = _getCachedResults();
        if (isNullOrUndefined(_cachedResults[cacheKey])) {
            //try to load from local storage
            let result = getCacheItem<IJsonSyncResult<T>>('jsr_' + cacheKey);

            if (!isNullOrUndefined(result) && (result.success === true || result.status === 404)) {
                if (!result.cachedTime) {
                    let now = new Date();
                    now.setDate(-1);
                    result.cachedTime = now.getTime();
                }

                _cachedResults[cacheKey] = result;
            }
        }

        if (!isNullOrUndefined(_cachedResults[cacheKey])) {
            let result = _cachedResults[cacheKey];

            var maxAge = isNumber(objects.cacheOptions.maxAge) && objects.cacheOptions.maxAge > 0 ? objects.cacheOptions.maxAge : null;

            if (maxAge && result.cachedTime) {
                let now = new Date().getTime();
                var cachedTime = result.cachedTime;
                var validUntil = cachedTime + (maxAge * 1000);

                if (now > validUntil) {
                    logger.debug("getCachedResult - entry has out lived max age");
                    return null;
                }
            }

            return {
                ..._cachedResults[cacheKey],
                result: _canSafelyStringify(_cachedResults[cacheKey].result) ?
                    jsonClone(_cachedResults[cacheKey].result) :
                    _cachedResults[cacheKey].result
            };
        }
    }
    return null;
}

function setCachedResult<T>(cacheOptions: IRestCacheOptions & { cacheKey?: string; }, response: IJsonSyncResult<T>) {
    if (isNullOrEmptyString(cacheOptions.cacheKey)) {
        return;
    }
    response.cachedTime = new Date().getTime();
    let isResultSerializable = _canSafelyStringify(response.result);

    let _cachedResults = _getCachedResults();
    _cachedResults[cacheOptions.cacheKey] = {
        ...response,
        result: isResultSerializable ? jsonClone(response.result) : response.result
    };

    if (!isResultSerializable) {
        logger.warn("When allowCache is true, Blob, ArrayBuffer and Document response types will only be stored in runtime memory and not committed to local storage.");
    }

    if (isResultSerializable && !isNullOrUndefined(cacheOptions.localStorageExpiration) && response && response.success === true) {
        setCacheItem('jsr_' + cacheOptions.cacheKey, response, cacheOptions.localStorageExpiration as any);
    }
}

function getPendingRequest<T = any>(objects: IRequestObjects): IPendingRequest<T> {
    var cacheKey = objects.cacheOptions.cacheKey;
    // if (isNullOrEmptyString(cacheKey)) {
    //     logger.warn('cache is not supported for this type of request.');
    // }

    let _pendingRequests = _getPendingRequests();

    if (!isNullOrEmptyString(cacheKey) && !isNullOrUndefined(_pendingRequests[cacheKey])) {
        //returned from cache
        return _pendingRequests[cacheKey];
    }
    return null;
}

function getParsedResponse<T>(objects: IRequestObjects) {
    let parsedResponse: T = null;
    if (!isNullOrEmptyString(objects.options.responseType) && objects.options.responseType !== "text") {
        parsedResponse = objects.xhr.response;
    } else {
        if (objects.options.responseType !== "text") {
            //Only try to parse if caller didn't expect text explicitly
            parsedResponse = jsonParse(objects.xhr.responseText);
        }
        if (isNullOrUndefined(parsedResponse)) {
            parsedResponse = objects.xhr.responseText as any;
        }
    }

    return parsedResponse;
}

function setPendingRequest<T = any>(cacheKey: string, objects: IRequestObjects, promise: Promise<T>): IPendingRequest<T> {
    if (isNullOrEmptyString(cacheKey)) {
        return null;
    }

    let _pendingRequests = _getPendingRequests();
    _pendingRequests[cacheKey] = { objects: objects, promise: promise, listeners: [] };
    return _pendingRequests[cacheKey];
}

function removePendingRequest(cacheKey: string) {
    if (isNullOrEmptyString(cacheKey)) {
        return;
    }

    try {
        let _pendingRequests = _getPendingRequests();
        _pendingRequests[cacheKey] = null;
        delete _pendingRequests[cacheKey];
    } catch (ex) {
    }
}

function _getRestErrorMessage(xhr: XMLHttpRequest) {
    try {
        //issue 245, external datasource might return error.code as a number with a plain text message.
        if (!isNullOrUndefined(xhr) && !isNullOrEmptyString(xhr.responseText)) {
            let error = jsonParse<{ code: string | number; message: string; }>(xhr.responseText);
            if (!isNullOrUndefined(error) && !isNullOrEmptyString(error.code)) {
                if (isString(error.code) && error.code.indexOf("SPQueryThrottledException") !== -1) {
                    return !isNullOrEmptyString(error.message) ? `${error.message} (SPQueryThrottledException)` : `an error occured (SPQueryThrottledException)`;
                }
                if (!isNullOrEmptyString(error.message)) return error.message;
            }
        }
    } catch (e) { }
    return `an error occured`;
}

function _canSafelyStringify(result: any) {
    //this would return false positives on some response strings    
    if (isPrimitiveValue(result)) {
        return true;
    } else if (isObject(result)) {
        if (
            ("ArrayBuffer" in globalThis && (result instanceof ArrayBuffer))
            || ("Blob" in globalThis && (result instanceof Blob))
            || ("Document" in globalThis && (result instanceof Document))
        ) {
            return false;
        }
        return true;
    } else {
        return false;//shouldn't get here... since result should either be primitive value or an object
    }
}

export function GetJsonSync<T>(url: string, body?: IRequestBody, options?: IRestOptions): IJsonSyncResult<T> {
    let xhr: XMLHttpRequest = null;
    let syncResult: IJsonSyncResult<T> = null;
    let objects = getXhr(url, body, options, false);
    try {
        var cachedResult = getCachedResult<T>(objects);
        if (!isNullOrUndefined(cachedResult)) {
            return cachedResult;
        }

        xhr = objects.xhr;

        if (objects.options.method === "GET") {
            objects.xhr.send();
        }
        else {
            objects.xhr.send(body);
        }

        if (objects.options.returnXhrObject === true) {
            return {
                status: xhr.status,
                success: xhr.status >= 200 && xhr.status < 400,
                result: xhr as any as T
            } as any;
        }

        // status < 300 leaves out 304 responses which are successful responses so we should use < 400
        if (objects.xhr.status >= 200 && objects.xhr.status < 400) {
            let result: T = getParsedResponse<T>(objects);

            syncResult = {
                status: xhr.status,
                success: true,
                result: result
            };

            setCachedResult(objects.cacheOptions, syncResult);
        } else {
            throw new Error("Error code: " + objects.xhr.status);
        }
    } catch (e) {
        //make sure errors get here and not returned without catch...
        let responseText = xhr.responseText;
        let errorData: any;
        if (!isNullOrEmptyString(responseText)) {
            errorData = jsonParse(responseText);
            if (isNullOrUndefined(errorData)) {
                errorData = responseText;
            }
        }

        let errorMessage = _getRestErrorMessage(xhr);

        syncResult = {
            status: xhr && xhr.status || -1,
            success: false,
            errorData: errorData,
            errorMessage: errorMessage
        };
        setCachedResult(objects.cacheOptions, syncResult);
    }
    return syncResult;
}

export async function GetJson<T>(url: string, body?: IRequestBody, options?: IRestOptions): Promise<T> {
    try {
        let objects = await getXhr(url, body, options, true);
        var cachedResult = getCachedResult<T>(objects);
        if (!isNullOrUndefined(cachedResult)) {
            if (!supressDebugMessages) {
                logger.debug(`GetJson - request fulfilled by cached results: ${url}`);
            }
            if (cachedResult.success) {
                return Promise.resolve(cachedResult.result);
            }
            else {
                return Promise.reject({
                    message: isNullOrEmptyString(cachedResult.errorMessage) ? "an error occured in cached results" : cachedResult.errorMessage,
                    errorData: cachedResult.errorData
                } as IRestError);
            }
        }

        var pendingRequest = getPendingRequest(objects);
        var xhrPromise: Promise<T> = null;

        if (isNullOrUndefined(pendingRequest)) {
            if (!supressDebugMessages) {
                logger.debug(`GetJson - request fulfilled by new request: ${url}`);
            }
            xhrPromise = new Promise((resolve, reject) => {
                let promiseResolved = false;

                objects.xhr.addEventListener("readystatechange", () => {
                    if (objects.xhr.readyState === XMLHttpRequest.DONE) {
                        try {
                            if (!supressDebugMessages) {
                                logger.debug(`readystate changed: ${url}`);
                            }
                            if (objects.options.returnXhrObject === true) {
                                promiseResolved = true;
                                resolve(objects.xhr as any as T);
                            }

                            let parsedResponse: T = getParsedResponse<T>(objects);

                            // status < 300 leaves out 304 responses which are successful responses so we should use < 400
                            if (objects.xhr.status >= 200 && objects.xhr.status < 400) {
                                setCachedResult(objects.cacheOptions, { status: objects.xhr.status, success: true, result: parsedResponse });
                                promiseResolved = true;
                                resolve(parsedResponse);
                                if (pendingRequest) {
                                    pendingRequest.listeners.forEach(l => {
                                        let listenerParsedResponse: T = getParsedResponse<T>(objects);
                                        l.resolve(listenerParsedResponse);
                                    });
                                }
                            } else {
                                let errorMessage = _getRestErrorMessage(objects.xhr);
                                setCachedResult(objects.cacheOptions, { status: objects.xhr.status, success: false, errorData: parsedResponse, errorMessage: errorMessage });
                                promiseResolved = true;
                                reject({ message: errorMessage, errorData: parsedResponse, xhr: objects.xhr } as IRestError);
                                if (pendingRequest) {
                                    pendingRequest.listeners.forEach(l => l.reject({ message: errorMessage, errorData: parsedResponse, xhr: objects.xhr } as IRestError));
                                }
                            }
                        } catch (e) {
                            if (!supressDebugMessages) {
                                logger.error(`readystate error: ${e}: ${url}`);
                            }
                        }
                        if (!promiseResolved) {
                            if (!supressDebugMessages) {
                                logger.debug(`promise NOT resolved. resoving myself...: ${url}`);
                            }

                            promiseResolved = true;
                            reject({ message: "an unknown error occured", xhr: objects.xhr } as IRestError);
                        }
                        else if (!supressDebugMessages) {
                            logger.debug(`promise resolved. removing pending request object: ${url}`);
                        }

                        removePendingRequest(objects.cacheOptions.cacheKey);
                    }
                });
            });

            if (objects.xhr.readyState === XMLHttpRequest.OPENED) {
                //only set this if our request is on the way
                pendingRequest = setPendingRequest(objects.cacheOptions.cacheKey, objects, xhrPromise);

                if (!supressDebugMessages) {
                    logger.debug(`${url}: sending request, setPendingRequest`);
                }

                if (objects.options.method === "GET") {
                    objects.xhr.send();
                } else {
                    objects.xhr.send(body);
                }
            }
            else logger.error('xhr not opened');
        } else if (pendingRequest) {
            if (!supressDebugMessages) {
                logger.debug(`GetJson - request fulfilled by pending requests: ${url}`);
            }
            //must add a separate promise, so that I can make a full(not shallow) copy of the result.
            //this way if the first caller changes the object, the second caller gets it unchanged.
            xhrPromise = new Promise<T>((resolve, reject) => {
                pendingRequest.listeners.push({
                    resolve: (result: T) => resolve(result),
                    reject: (reason) => reject(reason)
                });
            });
        }

        return xhrPromise;
    } catch (e) {
        return Promise.reject({ error: e, message: e.message, stack: e.stack });
    }
}

/** if you detected a change that invalidates all requests stored in memory - this will clear all in-memory cached results */
export function GetJsonClearCache() {
    let _cachedResults = _getCachedResults();
    Object.keys(_cachedResults).forEach(key => {
        delete _cachedResults[key];
    });
}
