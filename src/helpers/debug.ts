import { configInfo } from "../_dependencies";
import { kwiz_cdn_hostname_fastring, kwiz_cdn_hostname_localdev, kwiz_cdn_hostname_production } from "./constants";
import { deleteCookie, getCookie, setCookie } from "./cookies";
import { $w, getKWizComGlobal } from "./objects";
import { sleepAsync } from "./promises";
import { isFunction, isNotEmptyArray, isNullOrEmptyString, isNullOrUndefined } from "./typecheckers";

interface IKWizComGlobalDebug {
    _debug: boolean;
    _consoleLoggerFilter: string[];
    On: (Permanent?: boolean) => void;
    Off: () => void;
    ToggleLogs: (categoryName: string, silent?: boolean) => void;
    /** purge all cache storage (SPFx may keep scripts cached)  */
    PurgeCache: (options?: {
        skipCookies?: boolean;
        skipStorage?: boolean;
        onlyKWizComCaches?: boolean;
    }) => Promise<{ success: boolean; error?: any; message?: string; }>;
}

/** Get the global debug object. it will only be on the top window so don't put it in the IKWizComGlobals */
export function GetGlobalDebug() {
    return getKWizComGlobal(true) as { Debug?: IKWizComGlobalDebug; } & IKWizComGlobals;
}
function SetGlobalDebugFunction() {
    var kGlobal = GetGlobalDebug();

    if (isNullOrUndefined(kGlobal.Debug)) {
        kGlobal.Debug = {
            _debug: null,
            _consoleLoggerFilter: null,
            On: (Permanent?: boolean) => {
                kGlobal.Debug._debug = true;
                setCookie("KWizComDebug", "true", Permanent === true ? 365 : 1);
                console.log("KWIZ Debug Mode: On");
            },
            Off: () => {
                kGlobal.Debug._debug = false;
                deleteCookie("KWizComDebug");
                console.log("KWIZ Debug Mode: Off");
            },
            ToggleLogs: (categoryName: string, silent?: boolean) => {
                if (silent === true) {
                    if (kGlobal.Debug._consoleLoggerFilter === null)
                        kGlobal.Debug._consoleLoggerFilter = [categoryName];
                    else if (!kGlobal.Debug._consoleLoggerFilter.includes(categoryName))
                        kGlobal.Debug._consoleLoggerFilter.push(categoryName);
                }
                else {
                    if (kGlobal.Debug._consoleLoggerFilter === null)
                        kGlobal.Debug._consoleLoggerFilter = [];
                    else if (kGlobal.Debug._consoleLoggerFilter.includes(categoryName))
                        kGlobal.Debug._consoleLoggerFilter = kGlobal.Debug._consoleLoggerFilter.filter(c => c !== categoryName);
                }

                setCookie("KWizComDebugFilter", kGlobal.Debug._consoleLoggerFilter.join('~'), 365);
                console.log(`logs for ${categoryName} will ${silent === true ? 'not show up' : 'show up'}`);
            },
            PurgeCache: async (options?: {
                skipCookies?: boolean;
                skipStorage?: boolean;
                onlyKWizComCaches?: boolean;
            }) => {
                options = options || {};

                let result: { success: boolean; error?: any; message?: string; } = { success: true };
                let failedKeys: string[] = [];
                if (options.skipStorage !== true) {
                    console.log(`purging local storage`);
                    localStorage.clear();
                    console.log(`purging session storage`);
                    sessionStorage.clear();
                }

                if (options.skipCookies !== true) {
                    console.log(`purging all cookies`);
                    var cookies = document.cookie.split(";");
                    cookies.forEach(cookie => { document.cookie = cookie.split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT"; });
                }

                console.log(`purging caches`);
                try {
                    let keys = await caches.keys();
                    for (let i1 = 0; i1 < keys.length; i1++) {
                        let key = keys[i1];
                        try {
                            let cache = await caches.open(key);
                            if (cache) {
                                let subKeys = await cache.keys();
                                if (subKeys && subKeys.length) {
                                    let keysToRemove = options.onlyKWizComCaches !== true ? subKeys : subKeys
                                        .filter(k => k.url.toLowerCase().includes(`${kwiz_cdn_hostname_production}/`) ||
                                            k.url.toLowerCase().includes(`${kwiz_cdn_hostname_fastring}/`) ||
                                            k.url.toLowerCase().includes(`${kwiz_cdn_hostname_localdev}/`));
                                    for (let i2 = 0; i2 < keysToRemove.length; i2++) {
                                        let success = await cache.delete(keysToRemove[i2]);
                                        if (!success)//failed
                                            failedKeys.push(keysToRemove[i2].url);
                                    }
                                }
                            }
                        } catch (b) {
                            failedKeys.push(key);
                        }
                    }
                } catch (e) {
                    result.success = false;
                    result.error = e;
                    result.message = (e.message || "Something went wrong.");
                }

                if (isNotEmptyArray(failedKeys)) {
                    result.success = false;
                    result.message = (isNullOrEmptyString(result.message) ? '' : ' ') + `Failed keys: ${failedKeys.join()}`;
                }

                console.group('PurgeCache complete');
                console.dir(result);
                console.groupEnd();

                return result;
            }
        };
        //no need to do this anymore, once we added max-age cache to our response headers, the SP Service worker now clears
        //the cache of our SPFx controls on its own.
        // //by default - DO NOT clear cookies/storage and non-KWIZ caches!
        // window.setTimeout(() => kGlobal.Debug.PurgeCache({
        //     skipCookies: true,
        //     skipStorage: true,
        //     onlyKWizComCaches: true
        // }), 3000);
    }
}

SetGlobalDebugFunction();

export function isDebug() {
    var kGlobal = GetGlobalDebug();

    if (isNullOrUndefined(kGlobal.Debug._debug)) {
        kGlobal.Debug._debug = configInfo.IsLocalDev ||
            $w.location.href.indexOf('kwdebug=true') > 0 ||
            $w.location.href.indexOf('/workbench.aspx') > 0 ||
            getCookie("KWizComDebug") === "true";
    }
    return kGlobal.Debug._debug === true;
}
/** returns true if this is a kwizcom production/test tenant */
export function isKWizComTenant() {
    return $w.location.host === "kwizcom.sharepoint.com" || window.location.host === "kwizcomqa.sharepoint.com";
}
export function isDebugOnKWizComTenant() {
    return isKWizComTenant() && isDebug();
}

export function consoleLoggerFilter() {
    var kGlobal = GetGlobalDebug();

    if (isNullOrUndefined(kGlobal.Debug._consoleLoggerFilter)) {
        let KWizComDebugFilter = getCookie("KWizComDebugFilter");
        if (!isNullOrEmptyString(KWizComDebugFilter))
            kGlobal.Debug._consoleLoggerFilter = KWizComDebugFilter.split('~');
        else kGlobal.Debug._consoleLoggerFilter = [];
    }
    return kGlobal.Debug._consoleLoggerFilter;
}

export async function waitIfDebug(seconds?: number): Promise<void> {
    if (isDebug())
        await sleepAsync(seconds);
}

export function trackChangesToObject<T>(parent: unknown, objectName: string, tracker: {
    onBeforeGet?: (v: T) => void;
    onBeforeSet?: (v: T) => void;
    onAfterSet?: (v: T) => void;
}) {
    let originalValue: T = parent[objectName];
    Object.defineProperty(parent, objectName, {
        set: (newValue: T) => {
            if (isFunction(tracker.onBeforeSet)) tracker.onBeforeSet(newValue);
            originalValue = newValue;
            if (isFunction(tracker.onAfterSet)) tracker.onAfterSet(newValue);
        },
        get: () => {
            if (isFunction(tracker.onBeforeGet)) tracker.onBeforeGet(originalValue);
            return originalValue;
        }
    });
}