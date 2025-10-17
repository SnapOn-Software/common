import { sizeOf } from "../helpers/collections.base";
import { isDebug } from "../helpers/debug";
import { flatted } from "../helpers/flatted";
import { jsonParse } from "../helpers/json";
import { getGlobal } from "../helpers/objects";
import { isDate, isNullOrEmptyString, isNullOrUndefined, isNumber } from "../helpers/typecheckers";
import { ILocalStorageCacheLifetime } from "../types/localstoragecache.types";
import { ConsoleLogger } from "./consolelogger";

/**key with prefix, value is a date string */
interface IExpirationsDictionary {
    [keyWithPRefix: string]: string;
    build: string;
}

let logger = ConsoleLogger.get("utils/localstoragecache");

export const keyPrefix = "kw$_";
export const LOCAL_STORAGE_PREFIX = "kwizcom-localstorage-cache";
export const LOCAL_STORGAGE_EXPIRATIONS_KEY = LOCAL_STORAGE_PREFIX + "-expirations";
export const DEFAULT_EXPIRATION = 20 * 60 * 1000; // 20 minutes;
/** When caching logic changes (serialization methods, format, schema), the MODULE_REVISION should be incremented
 * and all client side apps will need to be rebuilt */
export const MODULE_REVISION = "1";
/** key (no prefix) is kept in lower case. not case sensitive */

function _getCache() {
    let _cache = getGlobal<{
        purgeCalled: boolean;
        expirations: IExpirationsDictionary;
        [keyNoPrefixToLower: string]: any;
    }>("common_utils_localstoragecache_module_cache");

    if (!_cache.purgeCalled) {
        //issue 7081 - purge all orphans/expired items
        _cache.purgeCalled = true;
        //clear expired cache items.
        (globalThis || window).setTimeout(() => {
            purgeCache();
            if (isDebug()) {
                let size = _getStoredSize();
                logger.debug(`Size of items in local storage: ${size}KB`);
            }
        }, 5000);
    }

    return _cache;
}

var _supportsLocalStorage: boolean = null;

function _parseExpiration(exp: number | ILocalStorageCacheLifetime | Date): Date {
    var expirationDate: Date;

    if (isNumber(exp) && exp > 0) {
        expirationDate = new Date();
        expirationDate.setMilliseconds(expirationDate.getMilliseconds() + exp);
    } else if (exp instanceof Date) {
        expirationDate = exp;
    } else if (exp) {
        var tempexp = exp as ILocalStorageCacheLifetime;
        var seconds = typeof (tempexp.seconds) === "number" ? tempexp.seconds : undefined;
        var minutes = typeof (tempexp.minutes) === "number" ? tempexp.minutes : undefined;
        var hours = typeof (tempexp.hours) === "number" ? tempexp.hours : undefined;
        var days = typeof (tempexp.days) === "number" ? tempexp.days : undefined;
        var months = typeof (tempexp.months) === "number" ? tempexp.months : undefined;
        var years = typeof (tempexp.years) === "number" ? tempexp.years : undefined;

        if (seconds || minutes || hours || days || months || years) {
            expirationDate = new Date();

            if (seconds) {
                expirationDate.setMilliseconds(expirationDate.getMilliseconds() + (seconds * 1000));
            }

            if (minutes) {
                expirationDate.setMilliseconds(expirationDate.getMilliseconds() + (minutes * 60 * 1000));
            }

            if (hours) {
                expirationDate.setMilliseconds(expirationDate.getMilliseconds() + (hours * 60 * 60 * 1000));
            }

            if (days) {
                expirationDate.setMilliseconds(expirationDate.getMilliseconds() + (days * 24 * 60 * 60 * 1000));
            }

            if (months) {
                expirationDate.setMonth(expirationDate.getMonth() + months);
            }

            if (years) {
                expirationDate.setFullYear(expirationDate.getFullYear() + years);
            }
        }
    }

    if (!expirationDate) {
        expirationDate = new Date();
        expirationDate.setMilliseconds(expirationDate.getMilliseconds() + DEFAULT_EXPIRATION);
    }

    return expirationDate;
}

function _getCacheExpirations(): IExpirationsDictionary {
    let _cache = _getCache();
    if (isNullOrUndefined(_cache.expirations)) {
        _cache.expirations = jsonParse<IExpirationsDictionary>(_getItem(LOCAL_STORGAGE_EXPIRATIONS_KEY));

        //ISSUE: 1525 - expire the cache if it was built with a different version number so that the cache 
        //is compatible with the current build
        if (!isNullOrUndefined(_cache.expirations) && _cache.expirations.build !== MODULE_REVISION) {
            logger.log(`Purging cache because of build number change`)
            purgeCache(true);
            _cache.expirations = null;
        }

        if (isNullOrUndefined(_cache.expirations)) {
            _cache.expirations = {
                build: MODULE_REVISION
            };
        }
    }

    return _cache.expirations;
}

function _saveCacheExpirations() {
    let _cache = _getCache();
    if (!isNullOrUndefined(_cache.expirations) && sizeOf(_cache.expirations) > 0) {
        _setItem(LOCAL_STORGAGE_EXPIRATIONS_KEY, JSON.stringify(_cache.expirations));
    }
    else {
        _removeItem(LOCAL_STORGAGE_EXPIRATIONS_KEY);
    }
}

function _setCacheExpiration(keyWithPrefix: string, expireDate: Date) {
    var expirations = _getCacheExpirations();
    expirations[keyWithPrefix] = expireDate.toISOString();
    _saveCacheExpirations();
}

function _isKeyExpired(keyWithPrefix: string) {
    var expirations = _getCacheExpirations();
    if (expirations && expirations[keyWithPrefix]) {
        var now = new Date();
        var eDate = new Date(expirations[keyWithPrefix]);
        if (now > eDate) {
            try {
                delete expirations[keyWithPrefix];
            } catch (ex) {
                expirations[keyWithPrefix] = undefined; // undefined variables are removed when passed to JSON.stringify
            }

            _saveCacheExpirations();
            //has a date, it is expired.
            return true;
        }
        //has a date, it is not expired yet.
        return false;
    }
    //has no date or not in expirations at all - say it is expired...
    return true;
}

function _getItem(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
    }
    return null;
}

function _setItem(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
    }
    return false;
}

function _removeItem(key: string) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
    }
    return false;
}

/**Get the size (KB) of all entries in local storage. Only returns the size for entries with kwizcom key prefix. */
function _getStoredSize() {
    let keys = getCacheKeys();
    let total = 0;
    let length = 0;
    let useBlob = 'Blob' in (globalThis || window);

    keys.forEach((key) => {
        let v = _getItem(`${keyPrefix}${key}`);
        if (!isNullOrEmptyString(v)) {
            if (useBlob) {
                length = (new Blob([v + key])).size;
            } else {
                length = ((v.length + key.length) * 2);
            }
        }
        total += length;
    });

    return Number((total / 1024).toFixed(2));
}

export function isLocalStorageSupported() {
    if (_supportsLocalStorage !== null) {
        return _supportsLocalStorage;
    }

    var result;
    try {
        _setItem(LOCAL_STORAGE_PREFIX, LOCAL_STORAGE_PREFIX);
        result = _getItem(LOCAL_STORAGE_PREFIX) === LOCAL_STORAGE_PREFIX;
        _removeItem(LOCAL_STORAGE_PREFIX);
        _supportsLocalStorage = result;
    } catch (ex) {
        _supportsLocalStorage = false;
    }

    return _supportsLocalStorage;
}

//#region exported methods
export function getCacheItem<T>(key: string, options?: {
    /** Flatted allows serizlising circular dependency objects */
    useFlatted?: boolean;
}): T {
    key = key.toLowerCase();
    let keyWithPrefix = keyPrefix + key;

    let _cache = _getCache();

    if (typeof (_cache[key]) !== "undefined"
        && _cache[key] !== null) {
        let isExpired = _isKeyExpired(keyWithPrefix);
        if (!isExpired) {
            return _cache[key] as T;
        } 
        //else remove it from cache
        removeCacheItem(key);        
    }

    if (isLocalStorageSupported()) {
        var value: string = _getItem(keyWithPrefix);
        if (isNullOrUndefined(value)) {
            return null;
        }

        let isExpired = _isKeyExpired(keyWithPrefix);

        if (!isExpired) {
            let valueAsT: T = options && options.useFlatted ? flatted.parse(value) as T : jsonParse<T>(value);
            if (valueAsT !== null) {
                _cache[key] = valueAsT;
                return valueAsT;
            } else {
                _cache[key] = value;
                return value as any as T;
            }
        }
        //else remove it from cache
        removeCacheItem(key);
    }

    return null;
}

export function setCacheItem(key: string, value: any, expiration: number | ILocalStorageCacheLifetime | Date, options?: {
    /** Flatted allows serizlising circular dependency objects */
    useFlatted?: boolean;
}): void {
    if (isLocalStorageSupported()) {
        key = key.toLowerCase();
        removeCacheItem(key);

        var val = null;
        try {
            if (options && options.useFlatted)
                val = flatted.stringify(value);
            else
                val = JSON.stringify(value);
        } catch (ex) {
            logger.debug(`Object cannot be stored in local storage: ${ex && ex.message || ex} ${key}`);
            return;//this put [object] in cache for me if object can't be stringified!
        }

        let keyWithPrefix = keyPrefix + key;

        var expireDate = _parseExpiration(expiration);

        let saved = _setItem(keyWithPrefix, val);
        if (saved) {
            _setCacheExpiration(keyWithPrefix, expireDate);
        }

        let _cache = _getCache();

        _cache[key] = value;
    }
}

export function removeCacheItem(keyNoPrefix: string) {
    keyNoPrefix = keyNoPrefix.toLowerCase();
    let _cache = _getCache();
    delete _cache[keyNoPrefix];
    let keyWithPrefix = keyPrefix + keyNoPrefix;

    if (isLocalStorageSupported()) {
        _removeItem(keyNoPrefix);//in case we have an old one
        _removeItem(keyWithPrefix);
    }
}

export function removeCacheItems(keys: string[]) {
    keys.forEach((key) => {
        removeCacheItem(key);
    });
}

export function getCacheKeys() {
    let keys: string[] = [];

    if (isLocalStorageSupported()) {
        keys = Object.keys(localStorage).filter((key) => {
            return key.startsWith(keyPrefix);
        }).map((key) => {
            return key.substring(keyPrefix.length);
        });
    }

    return keys;
}

/** remove expired cache keys created by this utility.
 * to remove all keys (non-expired too) send removeAll=true
 */
function purgeCache(removeAll?: boolean) {
    if (!isLocalStorageSupported()) return;

    var cacheExpirationsKeys = [
        LOCAL_STORGAGE_EXPIRATIONS_KEY,
        "kwizcom-aplfe-caching-expirations", // old clean up
        "localStorageExpirations" // old clean up
    ];

    let now = new Date();

    let nonExpiredKeys: string[] = [];

    //get all expiration keys (key/expiration date/time)
    for (let j = 0; j < cacheExpirationsKeys.length; j++) {
        try {
            let expirations = null;
            let cacheExpirationsKey = cacheExpirationsKeys[j];

            let removeAllForKey = removeAll || cacheExpirationsKey !== LOCAL_STORGAGE_EXPIRATIONS_KEY;

            if (cacheExpirationsKey === "localStorageExpirations") {
                //old format - load expirations from this one as well
                expirations = _getItem(cacheExpirationsKey); // "key1^11/18/2011 5pm|key2^3/10/2012 3pm"
                if (expirations) {
                    let arr = expirations.split("|"); // ["key1^11/18/2011 5pm","key2^3/10/2012 3pm"]
                    for (let i = 0; i < arr.length; i++) {
                        try {
                            let key_expiration_format = arr[i]; // "key1^11/18/2011 5pm"
                            let key = key_expiration_format.split("^")[0];
                            //old keys - remove all, all the time
                            _removeItem(key);//remove key from cache
                        } catch (e) { }
                    }
                }
            } else {
                //new format
                expirations = cacheExpirationsKey === LOCAL_STORGAGE_EXPIRATIONS_KEY ? _getCacheExpirations() : jsonParse(_getItem(cacheExpirationsKey));
                if (expirations) {
                    let expirationKeys = Object.keys(expirations);
                    logger.group(() => {
                        expirationKeys.forEach(keyWithPrefix => {
                            try {
                                let shouldRemoveKey = removeAllForKey || !keyWithPrefix.startsWith(keyPrefix);
                                if (!shouldRemoveKey) {
                                    //check specific key expiration
                                    let expirationDate = new Date(expirations[keyWithPrefix]);
                                    if (!isDate(expirationDate) || expirationDate < now) {
                                        shouldRemoveKey = true;
                                        delete expirations[keyWithPrefix];
                                        logger.info(`purging key ${keyWithPrefix}`);
                                    }
                                    else {
                                        nonExpiredKeys.push(keyWithPrefix);
                                    }
                                }
                                if (shouldRemoveKey) _removeItem(keyWithPrefix);
                            } catch (e) {
                                logger.warn(`failed to remove key ${keyWithPrefix}`);
                            }
                        });
                    }, "Checking expired items", true);
                }
            }

            if (cacheExpirationsKey === LOCAL_STORGAGE_EXPIRATIONS_KEY)
                _saveCacheExpirations();
            else//older keys - just remove them.
                _removeItem(cacheExpirationsKey);
        } catch (e) {
            logger.warn(`something went terribly wrong ${e}`);
        }
    }

    logger.group(() => {
        logger.table(nonExpiredKeys);
        //cleanup orphans
        //loop on all keys
        //if stats with: jsr_, kwfs| or keyPrefix - and not in nonExpiredKeys, it is an orphan. Remove it.
        let localStorageKeys = Object.keys(localStorage);
        for (let keyIdx = 0; keyIdx < localStorageKeys.length; keyIdx++) {
            let key = localStorageKeys[keyIdx];
            if (key.startsWith("jsr_") || key.startsWith("kwfs|")) {
                logger.log(`removing old key ${key}`);
                _removeItem(key);//old key
            }
            else if (key.startsWith(keyPrefix) && !nonExpiredKeys.includes(key))//orphan!
            {
                logger.log(`removing orphan key ${key}`);
                _removeItem(key);
            }
        }
    }, "Expired keys", true);
}

/** cleanup - remove all local storage keys created by this utility */
export function clearCache(): void {
    return purgeCache(true);
}
//#endregion