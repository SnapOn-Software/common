import { chunkArray } from "../../../helpers/collections.base";
import { getGlobal, jsonClone } from "../../../helpers/objects";
import { isBoolean, isNotEmptyArray, isNullOrEmptyArray, isNullOrUndefined, isNumber } from "../../../helpers/typecheckers";
import { jsonTypes } from "../../../types/rest.types";
import { IRestItem } from "../../../types/sharepoint.utils.types";
import { GetJson, GetJsonSync } from "../../rest";
import { GetListRestUrl } from "../list";

function _getGlobalCache() {
    let _cache = getGlobal<{ getItemsByIdCache: { [cachekey: string]: IRestItem[]; }; }>("SharePoint_Rest_List_Cache", {
        getItemsByIdCache: {}
    });
    return _cache;
}

/** return array will use the item ID as indexer, not a real array */
export async function GetItemsById<T extends IRestItem>(siteUrl: string, listIdOrTitle: string, itemIds: number[], options?: {
    expand?: string[];
    select?: string[];
    refreshCache?: boolean;
    jsonMetadata?: jsonTypes;
}) {
    try {
        let baseParams = _parseItemsByIdParams<T>(siteUrl, listIdOrTitle, itemIds, { ...options, batchRequests: itemIds.length > 1 });

        const { results, allowCache, queue } = baseParams;
        let cacheKey = baseParams.cacheKey;

        if (options && !isNullOrUndefined(options.jsonMetadata)) {
            cacheKey += "|jsonMetadata=" + options.jsonMetadata
        }

        if (queue.length > 0) {
            let promises = queue.map(batchRequestUrl => {
                return GetJson<tGetItemsByIdResult<T>>(batchRequestUrl, null, {
                    //do not allow cache. modern forms have apply option which will need this to reload the item
                    //it is cached in _restListItems anyways so this is not needed.
                    allowCache: allowCache === true,
                    includeDigestInGet: true,
                    jsonMetadata: options && options.jsonMetadata,
                    spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
                }).then(obj => {
                    if (!isNullOrUndefined(obj)) {
                        //no-metadata will return a value, as a single result or array
                        //otherwise, it'll go into "d"
                        let items: T[] = [];

                        if (isNoMetaDataResult(obj)) {
                            items = isNotEmptyArray(obj.value)
                                ? obj.value
                                : [obj.value];
                        }
                        else if (isVerboseResult(obj)) {
                            items = Array.isArray(obj.d.results)
                                ? obj.d.results
                                : [obj.d];
                        }
                        else if (isSingleResult(obj)) {
                            // Issue 1471: If only single item returns it not an array and just object
                            items.push(obj);
                        }

                        items.forEach((restItem) => {
                            results[Number(restItem.Id)] = restItem;
                            _addCacheItem(cacheKey, restItem);
                        });
                    }
                });
            });

            await Promise.all(promises);
        }

        return results;
    } catch (e) {
        throw new Error("Could not retrieve rest item from list");
    }
}

export function GetItemsByIdSync<T extends IRestItem>(siteUrl: string, listIdOrTitle: string, itemIds: number[], options?: {
    expand?: string[];
    select?: string[];
    refreshCache?: boolean;
    jsonMetadata?: jsonTypes;
}) {
    try {
        let baseParams = _parseItemsByIdParams<T>(siteUrl, listIdOrTitle, itemIds, { ...options, batchRequests: itemIds.length > 1 });

        const { results, allowCache, queue } = baseParams;
        let cacheKey = baseParams.cacheKey;

        if (options && !isNullOrUndefined(options.jsonMetadata)) {
            cacheKey += "|jsonMetadata=" + options.jsonMetadata
        }

        if (queue.length > 0) {
            queue.forEach((batchRequestUrl) => {
                let response = GetJsonSync<tGetItemsByIdResult<T>>(batchRequestUrl, null, {
                    //do not allow cache. modern forms have apply option which will need this to reload the item
                    //it is cached in _restListItems anyways so this is not needed.
                    allowCache: allowCache === true,
                    includeDigestInGet: true,
                    jsonMetadata: options && options.jsonMetadata,
                    spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
                });

                if (response && response.success && response.result) {
                    //no-metadata will return a value, as a single result or array
                    //otherwise, it'll go into "d"
                    let items: T[] = [];
                    if (isNoMetaDataResult(response.result)) {
                        items = isNotEmptyArray(response.result.value)
                            ? response.result.value
                            : [response.result.value];
                    }
                    else if (isVerboseResult(response.result)) {
                        items = Array.isArray(response.result.d.results)
                            ? response.result.d.results
                            : [response.result.d];
                    }
                    else if (isSingleResult(response.result)) {
                        // Issue 1471: If only single item returns it not an array and just object
                        items.push(response.result);
                    }

                    items.forEach((restItem) => {
                        results[Number(restItem.Id)] = restItem;
                        _addCacheItem(cacheKey, restItem);
                    });
                }
            });
        }

        return results;
    } catch (e) {
        throw new Error("Could not retrieve rest item from list");
    }
}

function _addCacheItem<T extends IRestItem>(cacheKey: string, item: T) {
    let g_cache = _getGlobalCache();
    if (isNullOrUndefined(g_cache.getItemsByIdCache[cacheKey])) {
        g_cache.getItemsByIdCache[cacheKey] = [];
    }
    g_cache.getItemsByIdCache[cacheKey][item.Id] = jsonClone(item);
}

function _getCacheItem<T extends IRestItem>(cacheKey: string, itemId: number) {
    let g_cache = _getGlobalCache();
    if (isNullOrUndefined(g_cache.getItemsByIdCache[cacheKey])) {
        g_cache.getItemsByIdCache[cacheKey] = [];
    }

    if (!isNullOrUndefined(g_cache.getItemsByIdCache[cacheKey][Number(itemId)])) {
        return jsonClone(g_cache.getItemsByIdCache[cacheKey][Number(itemId)]) as T;
    }

    return null;
}

function _refreshCache(cacheKey: string) {
    let g_cache = _getGlobalCache();
    g_cache.getItemsByIdCache[cacheKey] = [];
}

function _getItemsByIdBaseUrl(siteUrl: string, listIdOrTitle: string) {
    return `${GetListRestUrl(siteUrl, listIdOrTitle)}/items`;
}

function _parseItemsByIdParams<T extends IRestItem>(siteUrl: string, listIdOrTitle: string, itemIds: number[], options?: {
    expand?: string[];
    select?: string[];
    refreshCache?: boolean;
    batchRequests?: boolean;
}) {
    let baseUrl = _getItemsByIdBaseUrl(siteUrl, listIdOrTitle);

    let expand: string[] = [];
    let select: string[] = [];
    let allowCache = true;
    let results: T[] = [];
    let queue: string[] = [];

    if (!isNullOrUndefined(options)) {
        if (!isNullOrEmptyArray(options.select)) {
            select = options.select.sort();
        }

        if (!isNullOrEmptyArray(options.expand)) {
            expand = options.expand.sort();
        }

        if (isBoolean(options.refreshCache)) {
            allowCache = options.refreshCache !== true;
        }
    }

    let cacheKey = [baseUrl, select.join(",").toLowerCase(), expand.join(",").toLowerCase()].join("|");

    if (allowCache === true) {
        itemIds.forEach((itemId) => {
            let cachedItem = _getCacheItem<T>(cacheKey, itemId);
            if (!isNullOrUndefined(cachedItem)) {
                results[itemId] = cachedItem;
            }
        });
    } else {
        _refreshCache(cacheKey);
    }

    //remove item ids that were retrieved from cache
    itemIds = itemIds.filter((itemId) => {
        return !results.some((result) => {
            return Number(itemId) === Number(result.Id);
        });
    });

    if (itemIds.length !== 0) {
        let selectExpand: string[] = [];

        if (select.length) {
            selectExpand.push(`$select=${select.join(",")}`);
        }
        if (expand.length) {
            selectExpand.push(`$expand=${expand.join(",")}`);
        }

        let selectExpandQS = selectExpand.join("&");

        if (options.batchRequests === false) {
            itemIds.forEach((itemId) => {
                let getItemsRequestUrl = `${baseUrl}(${itemId})?${selectExpandQS}`;
                queue.push(getItemsRequestUrl);
            });
        } else {
            let chunks = chunkArray(itemIds, 60);
            for (var chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                let chunk = chunks[chunkIndex];

                let filter = chunk.map((id) => {
                    return `(ID eq ${id})`;
                }).join("or");

                let getItemsRequestUrl = `${baseUrl}?${[`$filter=${filter}`, selectExpandQS].join("&")}`;
                queue.push(getItemsRequestUrl);
            }
        }
    }

    return {
        results: results,
        allowCache: allowCache,
        queue: queue,
        cacheKey: cacheKey
    };
}

type tGetItemsByIdResult_Single<T> = T;
type tGetItemsByIdResult_Verbose<T> = {
    d: T | {
        results: T[];
    }
}
type tGetItemsByIdResult_NoMetadata<T> = {
    value: T | T[]
}
type tGetItemsByIdResult<T> = tGetItemsByIdResult_Single<T> | tGetItemsByIdResult_Verbose<T> | tGetItemsByIdResult_NoMetadata<T>;

function isVerboseResult<T extends IRestItem>(result: tGetItemsByIdResult<T>): result is tGetItemsByIdResult_Verbose<T> {
    return !isNullOrUndefined((result as tGetItemsByIdResult_Verbose<T>).d);
}
function isNoMetaDataResult<T extends IRestItem>(result: tGetItemsByIdResult<T>): result is tGetItemsByIdResult_NoMetadata<T> {
    return !isNullOrUndefined((result as tGetItemsByIdResult_NoMetadata<T>).value);
}
function isSingleResult<T extends IRestItem>(result: tGetItemsByIdResult<T>): result is tGetItemsByIdResult_Single<T> {
    return isNumber((result as tGetItemsByIdResult_Single<T>).Id);
}
