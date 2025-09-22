import { CommonLogger } from "../config";
import { isDebug } from "../helpers/debug";
import { getFromFullName, isFunction, isNullOrEmptyString, isNullOrUndefined, isString, isTypeofFullNameNullOrUndefined, typeofFullName } from "../helpers/typecheckers";
import { ksGlobal } from "../types/knownscript.types";

const logger = new CommonLogger("sod");

declare global {
    interface Window {
        g_kwizcom_sods: { [sodName: string]: Sod; };
    }
}

export interface iSodCallbacks {
    success: () => void;
    error: () => void;
}
interface ISodCallback_internal extends iSodCallbacks {
    called: boolean;
}

// eslint-disable-next-line no-shadow
enum SodState {
    pending = "pending",
    done = "done",
    error = "error"
}

export default class Sod {
    private sodName: string;
    private url: string;
    private script: HTMLScriptElement;
    private state: string;
    private notified: boolean;
    private callbacks: ISodCallback_internal[];

    public constructor(url: string, sodName: string) {
        this.url = url;
        this.sodName = sodName;
        this.state = SodState.pending;
        this.notified = false;
        this.callbacks = [];
        this.script = null;
    }

    private loadScript(scriptUrl: string, sync = false) {
        let self = this;
        var successCallback = () => {
            self.load();
        };
        var errorCallback = () => {
            self.error();
        };
        self.script = Sod.loadScript(scriptUrl, successCallback, errorCallback, sync);
        self.state = SodState.pending;
    }

    private load() {
        let self = this;
        self.state = SodState.done;
        if (!self.notified) {
            self.notify();
        }
    }

    private error() {
        let self = this;
        if (isDebug()) logger.error('unhandled error in sod: 0x0000002');
        //after error was logged - resolve all pending promises...
        //otherwise callers promises will never stop awaiting
        self.state = SodState.error;
        if (!self.notified) {
            self.notify();
        }
    }

    private notify() {
        let self = this;
        var callbackLength = self.callbacks.length;
        for (var i = 0; i < callbackLength; i++) {
            var sodCallback = self.callbacks[i];
            if (!sodCallback.called && typeof (sodCallback.success) === "function") {
                try {
                    self.state === SodState.error
                        ? sodCallback.error()
                        : sodCallback.success();
                    sodCallback.called = true;
                } catch (ex) {
                    if (isDebug()) logger.error('unhandled error in sod: 0x0000001');
                }
            }
        }
        self.notified = true;
    }

    private reset() {
        let self = this;
        var callbackLength = self.callbacks.length;
        for (var i = 0; i < callbackLength; i++) {
            this.callbacks[i].called = false;
        }
        self.notified = false;
    }

    private static loadScript(url: string, successCallback: () => void, errCallback: () => void, sync = false) {
        let scriptElm = document.createElement("script");
        if (sync === true) {
            let req = new XMLHttpRequest();
            req.open("GET", url, false);
            req.send();
            scriptElm.appendChild(document.createTextNode(req.responseText));
            successCallback();
        }
        else {
            let agt = navigator.userAgent.toLowerCase();
            let ie8down = agt.indexOf("msie") !== -1 && parseInt(agt.substring(agt.indexOf("msie ") + 5), 10) <= 8;

            let getCallback = (cb: () => void) => {
                return () => {
                    var loaded = false;

                    if (ie8down && typeof (scriptElm as any).readyState !== "undefined") {
                        loaded = (scriptElm as any).readyState === "complete" || (scriptElm as any).readyState === "loaded";
                    } else {
                        loaded = true;
                    }

                    if (loaded) {
                        (scriptElm as any).onreadystatechange = null;
                        scriptElm.onload = null;
                        scriptElm.onerror = null;
                        cb();
                    }
                };
            };

            scriptElm.type = "text/javascript";
            scriptElm.src = url;
            if (ie8down) {
                (scriptElm as any).onreadystatechange = getCallback(successCallback);
            } else {
                scriptElm.onload = getCallback(successCallback);
                scriptElm.onerror = getCallback(errCallback);
            }
        }
        (document.head || document.getElementsByTagName("HEAD")[0]).appendChild(scriptElm);
        return scriptElm;
    }

    public static getGlobal(global: ksGlobal) {
        if (isString(global))
            return getFromFullName(global);
        else
            return global.getter();
    }

    public static ensureScriptNoPromise(scriptUrl: string, global: ksGlobal, callbacks?: iSodCallbacks, sodName?: string, sync = false) {
        if (!isNullOrEmptyString(global) && typeofFullName(Sod.getGlobal(global)) !== "undefined") {
            //this global object already exists, no need to reload this script.
            if (isFunction(callbacks && callbacks.success)) {
                callbacks.success();
            }
        }
        else {
            sodName = (isNullOrEmptyString(sodName) === false && sodName || scriptUrl).toLowerCase();
            var sod = Sod._getGlobalSod(sodName);

            if (!sod) {
                sod = Sod._addGlobalSod(sodName, scriptUrl);
            }

            if (!isNullOrUndefined(callbacks)) {
                sod.callbacks.push({
                    called: false,
                    success: callbacks.success,
                    error: callbacks.error
                });
            }

            if (!sod.script) {
                sod.loadScript(scriptUrl, sync);
            } else if (sod.state === SodState.done || sod.state === SodState.error || sod.notified) {
                sod.notify();
            }
        }
    }

    public static async ensureScript(scriptUrl: string, global: ksGlobal, callbacks?: iSodCallbacks, sodName?: string, sync = false): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let resolveCallback = () => {
                callbacks && callbacks.success();
                resolve();
            };
            let rejectCallback = () => {
                callbacks && callbacks.error();
                reject();
            };
            Sod.ensureScriptNoPromise(scriptUrl, global, { success: resolveCallback, error: rejectCallback }, sodName, sync);
        });
    }

    private static _initGlobalSods() {
        //static must be globally shared between all instances...
        if (isTypeofFullNameNullOrUndefined("g_kwizcom_sods")) {
            window.g_kwizcom_sods = {};
        }
    }

    private static _getGlobalSod(name: string) {
        Sod._initGlobalSods();
        return window.g_kwizcom_sods[name];
    }

    private static _addGlobalSod(name: string, scriptUrl: string) {
        Sod._initGlobalSods();
        window.g_kwizcom_sods[name] = new Sod(scriptUrl, name);
        return window.g_kwizcom_sods[name];
    }
}