import { kwiz_cdn_root } from "../helpers/constants";
import { isDebug } from "../helpers/debug";
import { isFunction, isNotEmptyArray, isNullOrEmptyString, isNullOrUndefined } from "../helpers/typecheckers";
import { IKnownScript, ksGlobal } from "../types/knownscript.types";
import Sod, { iSodCallbacks } from "./sod";

export interface IScriptUtils {
    /** @deprecated - use wrapFunction instead from helpers/functions */
    wrapFunction3?: (originalFunction: () => void, instance: any, doBefore: () => void, doAfter: () => void) => void;
    loadKnownScript: (script: IKnownScript) => void;
    loadKnownScript_Sync: (script: IKnownScript) => void;
    ensureScript: (scriptUrl: string, global: ksGlobal, callback: (() => void) | iSodCallbacks, sodName: string) => void;
    ensureScripts: (scripts: { scriptUrl: string; global: ksGlobal; sodName: string; }[], callback: (() => void) | iSodCallbacks) => void;
}

export default class script implements IScriptUtils {
    private static instance: script = null;
    public isRtl = false;
    public static get Instance() {
        if (script.instance === null) {
            //share single instance between all imports
            if (typeof (window as any).kSingleScripts !== 'undefined')
                script.instance = (window as any).kSingleScripts;//a global instance already exists, use it
            else {
                script.instance = new script();
                (window as any).kSingleScripts = script.instance;//place this instance in the global namespace for others to reuse
            }
        }
        return script.instance;
    }

    public async loadKnownScript(knownScript: IKnownScript) {
        var promisesDependencies: Promise<any>[] = [];
        (knownScript.dependencies || []).forEach(dep => {
            promisesDependencies.push(this.loadKnownScript(dep));
        });

        if (promisesDependencies.length > 0)
            await Promise.all(promisesDependencies);

        return new Promise((resolve, reject) => {
            this.ensureKnownScriptInternal(knownScript, {
                success: () => {
                    resolve(Sod.getGlobal(knownScript.global));
                },
                error: reject
            });
        });
    }
    public loadKnownScript_Sync(knownScript: IKnownScript) {
        try {
            if (isNotEmptyArray(knownScript.dependencies)) {
                (knownScript.dependencies || []).forEach(dep => {
                    this.loadKnownScript_Sync(dep)
                });
            }
        } catch {
        }

        this.ensureKnownScriptInternal(knownScript, undefined, true);
        return Sod.getGlobal(knownScript.global);
    }

    private ensureKnownScriptInternal(knownScript: IKnownScript, callbacks?: iSodCallbacks, sync = false) {
        let url = isDebug() && !knownScript.forceMin ? knownScript.url.replace('.min.js', '.js') : knownScript.url;
        if (url[0] === '/') url = kwiz_cdn_root() + url;

        if (sync === true)
            this.ensureScriptSync(url, knownScript.global, callbacks, knownScript.sodName);
        else
            this.ensureScript(url, knownScript.global, callbacks, knownScript.sodName);

        let cssFiles = this.isRtl === true && !isNullOrUndefined(knownScript.rtlCss) ? knownScript.rtlCss : knownScript.css;
        if (!isNullOrUndefined(cssFiles))
            cssFiles.forEach(css => {
                if (!isNullOrEmptyString(css)) {
                    let cssurl = isDebug() && !knownScript.forceMin ? css.replace('.min.css', '.css') : css;
                    if (cssurl[0] === '/') cssurl = kwiz_cdn_root() + cssurl;

                    let knownStyles = document.getElementsByClassName("kwizcom_known_css");
                    let found = false;
                    for (let si = 0; si < knownStyles.length; si++) {
                        let elm: HTMLLinkElement = knownStyles[si] as HTMLLinkElement;
                        if (elm.href && elm.href.toLowerCase() === cssurl.toLowerCase()) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        let link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.className = "kwizcom_known_css";
                        link.type = "text/css";
                        link.href = cssurl;
                        document.head.appendChild(link);
                    }
                }
            });
    }

    public loadCss(cssUrl: string) {
        let knownStyles = document.getElementsByClassName("kwizcom_known_css");
        let found = false;
        for (let si = 0; si < knownStyles.length; si++) {
            let elm: HTMLLinkElement = knownStyles[si] as HTMLLinkElement;
            if (elm.href && elm.href.toLowerCase() === cssUrl.toLowerCase()) {
                found = true;
                break;
            }
        }
        if (!found) {
            let link = document.createElement("link");
            link.rel = "stylesheet";
            link.className = "kwizcom_known_css";
            link.type = "text/css";
            link.href = cssUrl;
            document.head.appendChild(link);
        }
    }

    public ensureScriptSync(scriptUrl: string, global: ksGlobal, callbacks?: iSodCallbacks, sodName?: string) {
        //in IE there is no promise, we cannot use any async functions
        return Sod.ensureScriptNoPromise(scriptUrl, global, callbacks, sodName, true);
    }
    public async ensureScript(scriptUrl: string, global: ksGlobal, callbacks?: (() => void) | iSodCallbacks, sodName?: string) {
        if (isFunction(callbacks))
            callbacks = { success: callbacks, error: callbacks };
        return Sod.ensureScript(scriptUrl, global, callbacks, sodName, false);
    }
    /** ensure a collection of scripts and call the callback when they are all done */
    public async ensureScripts(scripts: { scriptUrl: string; global: ksGlobal; sodName: string; }[], callbacks?: (() => void) | iSodCallbacks) {
        if (isFunction(callbacks))
            callbacks = { success: callbacks, error: callbacks };

        let promises: Promise<void>[] = [];
        let length = scripts.length;
        let finished = 0;
        let hadError = false;
        const cbs: iSodCallbacks = callbacks ? {
            success: () => {
                finished++;
                if (finished === length)//all finished
                {
                    hadError
                        ? callbacks.error()
                        : callbacks.success();
                }
            },
            error: () => {
                hadError = true;
                finished++;
                if (finished === length)//all finished
                    callbacks.error();
            }
        } : null;

        scripts.forEach(scr => {
            promises.push(Sod.ensureScript(scr.scriptUrl, scr.global, cbs, scr.sodName));
        });

        return Promise.all(promises);
    }

    private _WrapFunctionArr: any[] = [];

    /** @deprecated - use wrapFunction instead from helpers/functions */
    public wrapFunction3(originalFunction: () => void, instance: any, doBefore: () => void, doAfter: () => void) {
        try {
            if (instance !== null) {
                originalFunction.bind(instance);
            }
            var idx = this._WrapFunctionArr.length;
            this._WrapFunctionArr[idx] = originalFunction;

            originalFunction = function (...args: any[]) {
                if (typeof (doBefore) === "function") {
                    doBefore.apply(instance, args);
                }
                var returnValue = this._WrapFunctionArr[idx].apply(instance, args);
                if (typeof (doAfter) === "function") {
                    doAfter.apply(instance, args);
                }

                return returnValue;
            };
            if (instance !== null) {
                originalFunction.bind(instance);
            }
        } catch (e) {
            if (isDebug()) console.log('unhandled error in wrapFunction3');
        }
    }
}