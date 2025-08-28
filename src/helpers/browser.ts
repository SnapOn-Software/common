import { IDictionary } from "../types/common.types";
import { firstIndexOf } from "./collections.base";
import { LOGO_ANIM } from "./images";
import { getGlobal } from "./objects";
import { getUniqueId } from "./random";
import { stripRichTextWhitespace } from "./strings";
import { isBoolean, isFunction, isNotEmptyArray, isNotEmptyString, isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber, isNumeric, isString, isTypeofFullNameNullOrUndefined, isUndefined } from "./typecheckers";
import { getURLExtension, isDataUrl } from "./url";

let _global = getGlobal<{
    registerUrlChangedCallbacks: Function[];
    urlChangedHandlerRegistered: boolean
}>("browser", {
    registerUrlChangedCallbacks: [],
    urlChangedHandlerRegistered: false
}, true);

export function triggerNativeEvent(ele: HTMLElement | Element | Document, eventName: string) {
    if (isNullOrUndefined(ele)) {
        return;
    }
    if (!isNullOrUndefined((ele as any).fireEvent)) { // < IE9
        (ele as any).fireEvent('on' + eventName);
    } else {
        // Different events have different event classes.
        // If this switch statement can't map an eventName to an eventClass,
        // the event firing is going to fail.
        let eventClass = "Events";
        switch (eventName) {
            case "click": // Dispatching of 'click' appears to not work correctly in Safari. Use 'mousedown' or 'mouseup' instead.
            case "mousedown":
            case "mouseup":
                eventClass = "MouseEvents";
                break;

            case "focus":
            case "change":
            case "blur":
            case "select":
                eventClass = "HTMLEvents";
                break;

            default:
                eventClass = "CustomEvent";
                break;
        }

        var evt = document.createEvent(eventClass);
        evt.initEvent(eventName, true, true);
        ele.dispatchEvent(evt);
    }
}

export function addEventHandler(elm: HTMLElement | Element | Document | Window, event: string, handler: EventListenerOrEventListenerObject) {
    if (isUndefined(elm.addEventListener))//IE8
        (elm as any).attachEvent("on" + event, handler);
    else
        elm.addEventListener(event, handler, false);
}

const saveFileLinkId = "kwizcom_download_link_tmp";
/** prompts user to save/download a text file */
export function saveFile(fileName: string, fileData: string, type: "application/json" | "text/csv") {
    //Issue 6003
    let blobObject = new Blob([fileData], { type: `${type};charset=utf-8;` });

    if (window.Blob && window.navigator["msSaveOrOpenBlob"]) {
        //edge/IE        
        window.navigator["msSaveOrOpenBlob"](blobObject, fileName);
    }
    else {
        //Issue 6025
        //var encodedUri = `data:${type};charset=utf-8,` + encodeURIComponent(fileData);

        let link = document.getElementById(saveFileLinkId) as HTMLAnchorElement;
        if (link) {
            link.remove();
            link = null;
        }
        var url = URL.createObjectURL(blobObject);
        if (!link) {
            link = document.createElement("a");
            link.style.position = "fixed";
            link.style.top = "-200px";
            link.download = fileName;
            link.innerHTML = "Click Here to download";
            DisableAnchorIntercept(link);
            link.id = saveFileLinkId;
            document.body.appendChild(link); // Required for FF
            link.href = url;
        }
        window.setTimeout(() => {
            link.click();
        }, 200);
    }
}

export function saveZipFile(fileName: string, fileDataBase64: string) {

    let link = document.getElementById(saveFileLinkId) as HTMLAnchorElement;
    if (link) {
        link.remove();
        link = null;
    }
    var url = `data:application/zip;base64,${fileDataBase64}`;
    if (!link) {
        link = document.createElement("a");
        link.style.position = "fixed";
        link.style.top = "-200px";
        link.download = fileName;
        link.innerHTML = "Click Here to download";
        DisableAnchorIntercept(link);
        link.id = saveFileLinkId;
        document.body.appendChild(link);
        link.href = url;
    }
    window.setTimeout(() => {
        link.click();
    }, 200);
}

/** force browser to download instead of opening a file */
export function downloadFile(url: string) {
    var link = document.createElement('a');
    link.href = url;
    var parts = link.href.replace(/\\/g, "/").split('/');
    var fileName = parts[parts.length - 1];
    link.download = fileName;
    DisableAnchorIntercept(link);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function copyTextToClipboard(text: string, multiline?: boolean): boolean {
    var input = document.createElement(multiline ? "textarea" : "input");
    input.value = text;
    input.style.position = "absolute";
    input.style.top = "-100px";
    input.style.left = "-100px";
    document.body.appendChild(input);
    let copied = copyToClipboard(input);
    input.remove();
    return copied;
}

/** copies the text of an element to the clipboard. if not supported by browser - will return false so caller must check and show
 * a message to the user asking him to hit ctrl+c
 */
export function copyToClipboard(el: HTMLElement): boolean {
    // Copy textarea, pre, div, etc.
    if ((document.body as any).createTextRange) {
        // IE 
        var textRange = (document.body as any).createTextRange();
        textRange.moveToElementText(el);
        textRange.select();
        textRange.execCommand("Copy");
        return true;
    }
    else if (window.getSelection && document.createRange) {
        // non-IE
        var editable = el.contentEditable; // Record contentEditable status of element
        var readOnly = (el as any).readOnly; // Record readOnly status of element
        (el as any).contentEditable = true; // iOS will only select text on non-form elements if contentEditable = true;
        (el as any).readOnly = false; // iOS will not select in a read only form element
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range); // Does not work for Firefox if a textarea or input
        if (el.nodeName === "TEXTAREA" || el.nodeName === "INPUT")
            (el as HTMLInputElement).select(); // Firefox will only select a form element with select()
        if ((el as any).setSelectionRange && navigator.userAgent.match(/ipad|ipod|iphone/i))
            (el as any).setSelectionRange(0, 999999); // iOS only selects "form" elements with SelectionRange
        (el as any).contentEditable = editable; // Restore previous contentEditable status
        (el as any).readOnly = readOnly; // Restore previous readOnly status 
        if (document.queryCommandSupported("copy")) {
            var successful = document.execCommand('copy');
            if (successful) return true;
            else return false;
        }
        else {
            if (!navigator.userAgent.match(/ipad|ipod|iphone|android|silk/i))
                return false;
        }
    }
    return false;
}

export function pasteTextAtCursor(textArea: HTMLTextAreaElement | HTMLInputElement, text: string) {
    if (isNullOrEmptyString(text)) return;
    text = text.replace(/\r/g, '');//remove \r it messes up the cursor location when pasting with line break
    const selectionStart = textArea.selectionStart;
    const selectionEnd = textArea.selectionEnd;
    const value = textArea.value;

    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);

    textArea.value = before + text + after;

    textArea.selectionStart = selectionStart + text.length;
    textArea.selectionEnd = selectionStart + text.length;
}

/** wraps the html in a div element and returns it */
export function elementFromHtml(html: string) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return <HTMLDivElement>d;
}

export function HtmlTextContents(htmlElement: string | HTMLElement) {
    let innerText = (isString(htmlElement) ? elementFromHtml(htmlElement) : htmlElement).innerText;
    return stripRichTextWhitespace(innerText.replace(/\n/g, " ").replace(/ {2}/g, " "));
}

export function registerDOMContentLoadedListener(doc?: Document) {
    return new Promise<void>((resolve, reject) => {
        doc = doc || document;

        if (isNullOrUndefined(doc)) {
            reject();
            return;
        }

        if (!isNullOrUndefined(doc) && doc.readyState === "loading") {
            doc.addEventListener("DOMContentLoaded", () => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

export function registerDocumentLoadComplete(doc?: Document) {
    return new Promise<void>((resolve, reject) => {
        doc = doc || document;

        if (isNullOrUndefined(doc) || !isFunction(doc.addEventListener)) {
            reject();
            return;
        }

        if (doc.readyState === "complete") {
            resolve();
        } else {
            doc.addEventListener("readystatechange", () => {
                if (doc.readyState === "complete") {
                    resolve();
                }
            });
        }
    });
}

/** on modern experience, using navagation does inplace-page update.
 * document ready, and all windows events will not trigger and global objects will remain.
 * our app loader will fire this event when the page does that navigation so we can hook up to be notified.
 */
export function registerModernInplaceNavigationOnInit(handler: () => void) {
    addEventHandler(document, "kwOnInit", handler);
}
/** Triggers handler when theme changes on a modern page
 * When the user changes the site's theme, or when navigating to a sub-site, or clicking back
 * in the browser navigating back to parent site with different theme
 */
export function registerModernThemeChanged(handler: () => void) {
    addEventHandler(document, "kwOnThemeChanged", handler);
}

interface iObserverHandlerBase {
    handler?: () => void;
    key?: string;
    ignoreSubTree?: boolean;
};
interface iObserverHandlerWithKey extends iObserverHandlerBase {
    key: string;
}
interface iObserverHandlerWithHandler extends iObserverHandlerBase {
    handler: () => void;
}
interface iObserverHandlerWithKeyAndHandler extends iObserverHandlerBase {
    handler: () => void;
    key: string;
}

type DOMChangedObserverDef = {
    ele: HTMLElement;
    ignoreSubTree: boolean;
    callbacks: iObserverHandlerWithHandler[];
    disconnect?: () => void;
};
let _DOMChangedObserverDefs: DOMChangedObserverDef[] = [];

function _getDOMChangedObserverDef(ele: HTMLElement, ignoreSubTree: boolean) {
    if (!isElement(ele)) {
        return null;
    }
    let existingDef = _DOMChangedObserverDefs.filter((observer) => {
        let observerEle = observer.ele;
        return observer.ignoreSubTree === ignoreSubTree && isElement(observerEle) && observerEle.isSameNode(ele);
    })[0];
    return existingDef;
}

function _getDomObserverCallbackInfo(callbackOrHandler: (() => void) | iObserverHandlerWithKey) {
    return {
        handler: isNullOrUndefined(callbackOrHandler) ? null : isFunction(callbackOrHandler) ? callbackOrHandler : callbackOrHandler.handler,
        key: isNullOrUndefined(callbackOrHandler) || isFunction(callbackOrHandler) ? null : callbackOrHandler.key,
        ignoreSubTree: isNullOrUndefined(callbackOrHandler) || isFunction(callbackOrHandler) ? false : callbackOrHandler.ignoreSubTree === true
    };

}

export function registerDOMChangedObserver(callbackOrHandler: (() => void) | iObserverHandlerWithKeyAndHandler, ele?: HTMLElement) {
    let callbackInfo = _getDomObserverCallbackInfo(callbackOrHandler);
    if (!isFunction(callbackInfo.handler)) {
        return;
    }

    var win: Window & typeof globalThis;
    var doc: Document;

    if (ele) {
        try {
            doc = ele.ownerDocument;
            win = doc.defaultView || (doc as any).parentWindow;
        } catch (ex) {
        }
    } else {
        win = window;
        doc = window && window.document;
        ele = doc.body;
    }

    if (isNullOrUndefined(win) || isNullOrUndefined(doc)) {
        return;
    }

    registerDOMContentLoadedListener(win.document).then(() => {
        let existingDef = _getDOMChangedObserverDef(ele, callbackInfo.ignoreSubTree);

        if (!isNullOrUndefined(existingDef)) {
            let existingCallbackIndex = isNullOrEmptyString(callbackInfo.key) ? -1 : firstIndexOf(existingDef.callbacks, cb => cb.key === callbackInfo.key);
            if (existingCallbackIndex >= 0) {
                //replace
                existingDef.callbacks[existingCallbackIndex].handler = callbackInfo.handler;
            }
            else {
                existingDef.callbacks.push(callbackInfo);
            }
            return;
        }

        let newDef: DOMChangedObserverDef = {
            ele: ele,
            ignoreSubTree: callbackInfo.ignoreSubTree,
            callbacks: [callbackInfo]
        };

        let onDomChanged = () => {
            if (!isNullOrUndefined(newDef) && !isNullOrEmptyArray(newDef.callbacks)) {
                newDef.callbacks.forEach((c) => {
                    try {
                        c.handler();
                    } catch (e) { }
                });
            }
        };

        if ("MutationObserver" in win) {
            let observer: MutationObserver = new win.MutationObserver((mutations) => {
                let hasUpdates = mutations.some((mutation) => {
                    return !!mutation.addedNodes && !!mutation.addedNodes.length
                        || !!mutation.removedNodes && !!mutation.removedNodes.length;
                });

                if (hasUpdates) {
                    onDomChanged();
                }
            });

            observer.observe(ele, {
                childList: true,
                subtree: callbackInfo.ignoreSubTree === true ? false : true,
                attributes: false,
                characterData: false
            });

            newDef.disconnect = () => {
                observer.disconnect();
                observer = null;
            };
        } else {
            let domEvents = ["DOMNodeInsertedIntoDocument", "DOMNodeRemovedFromDocument"];

            domEvents.forEach((eventName) => {
                newDef.ele.addEventListener(eventName, onDomChanged, false);
            });

            newDef.disconnect = () => {
                domEvents.forEach((eventName) => {
                    newDef.ele.removeEventListener(eventName, onDomChanged, false);
                });
            };
        }

        _DOMChangedObserverDefs.push(newDef);
    });
}

export function removeDOMChangedObserver(callbackOrHandler: (() => void) | iObserverHandlerWithKey, ele?: HTMLElement) {
    let callbackInfo = _getDomObserverCallbackInfo(callbackOrHandler);
    if (!isFunction(callbackInfo.handler) && isNullOrEmptyString(callbackInfo.key)) {
        return;//need function or key to remove
    }

    var win: Window;
    var doc: Document;

    if (ele) {
        try {
            doc = ele.ownerDocument;
            win = doc.defaultView || (doc as any).parentWindow;
        } catch (ex) {
        }
    } else {
        win = window;
        doc = window && window.document;
        ele = doc.body;
    }

    if (isNullOrUndefined(win) || isNullOrUndefined(doc)) {
        return;
    }

    registerDOMContentLoadedListener(win.document).then(() => {
        let existingDef = _getDOMChangedObserverDef(ele, callbackInfo.ignoreSubTree);

        if (isNullOrUndefined(existingDef) || !isElement(existingDef.ele)) {
            return;
        }

        if (!isNullOrEmptyString(callbackInfo.key))//find by key
        {
            existingDef.callbacks = existingDef.callbacks.filter((cb) => {
                return cb.key !== callbackInfo.key;
            });
        }
        else//find by handler - probably won't work for functions that are declared inline
        {
            existingDef.callbacks = existingDef.callbacks.filter((cb) => {
                return isNullOrEmptyString(cb.key) && cb.handler !== callbackInfo.handler;
            });
        }

        if (existingDef.callbacks.length === 0) {
            existingDef.disconnect();
            _DOMChangedObserverDefs = _DOMChangedObserverDefs.filter((def) => {
                return def !== existingDef;
            });
        }
    });
}

export function isElementVisible(ele: HTMLElement) {
    //must be a valid element
    if (!isElement(ele) || !ele.getAttribute) {
        return false;
    }

    try {
        var doc = ele.ownerDocument;
        var win = doc.defaultView || (doc as any).parentWindow;

        var computed = win.getComputedStyle(ele);

        return !!(computed.display.toLowerCase() !== "none"
            && computed.visibility.toLowerCase() !== "hidden"
            && (ele.offsetWidth !== 0
                || ele.offsetHeight !== 0
                || ele.offsetParent !== null
                || ele.getClientRects().length));

    } catch (ex) {
    }
    return false;
}

export function querySelectorAllFirstOrNull(selectors: string | string[], maintainOrder = false) {
    if (isNullOrUndefined(selectors)) {
        return null;
    }

    if (maintainOrder) {
        return (querySelectorAllMaintainOrder(selectors)[0] || null);
    } else {
        var result =
            isString(selectors) && !isNullOrEmptyString(selectors) ? document.querySelectorAll(selectors as string)[0] :
                Array.isArray(selectors) ? document.querySelectorAll((selectors as string[]).join(","))[0] : null;

        return (result || null);
    }
}

export function querySelectorAllMaintainOrder(selectors: string | string[], parent?: HTMLElement | Document | Element) {
    if (isNullOrUndefined(selectors)) {
        return null;
    }

    var query: string[];

    if (isString(selectors) && !isNullOrEmptyString(selectors)) {
        query = (selectors as string).split(",");
    }
    if (Array.isArray(selectors)) {
        query = selectors as string[];
    }

    var eles: HTMLElement[] = [];

    parent = parent || document;

    query.forEach((selector) => {
        if (isString(selector) && !isNullOrEmptyString(selector)) {
            var result = Array.prototype.slice.call(parent.querySelectorAll(selector)) as HTMLElement[];
            eles = eles.concat(result);
        }
    });

    return eles;
}

export function getScrollParent(node: HTMLElement): HTMLElement {
    if (node === null) {
        return null;
    }

    if (node.scrollHeight > node.clientHeight) {
        return node;
    } else {
        return getScrollParent((node as Node).parentNode as HTMLElement);
    }
}

var _scrollbarWidth = -1;
export function getScrollbarWidth() {
    if (_scrollbarWidth < 0) {
        var outer = document.createElement("div");
        outer.style.visibility = "hidden";
        outer.style.width = "100px";
        outer.style["msOverflowStyle"] = "scrollbar"; // needed for WinJS apps

        document.body.appendChild(outer);

        var widthNoScroll = outer.offsetWidth;
        // force scrollbars
        outer.style.overflow = "scroll";

        // add innerdiv
        var inner = document.createElement("div");
        inner.style.width = "100%";
        outer.appendChild(inner);

        var widthWithScroll = inner.offsetWidth;

        // remove divs
        outer.parentNode.removeChild(outer);

        _scrollbarWidth = widthNoScroll - widthWithScroll;
    }
    return _scrollbarWidth;
}

export function cumulativeOffset(element: HTMLElement) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent as HTMLElement;
    } while (element);

    return {
        top: top,
        left: left
    };
}

export function computedStyleToInlineStyle(elm: HTMLElement, options: { recursive?: boolean; removeClassNames?: boolean; } = { recursive: true, removeClassNames: true }) {
    if (!elm) {
        return;
    }

    if (options.recursive && elm.children && elm.children.length) {
        var children = <HTMLElement[]>Array.prototype.slice.call(elm.children);
        children.forEach(child => {
            computedStyleToInlineStyle(child, options);
        });
    }

    var computedStyle = window.getComputedStyle(elm);

    if (options.removeClassNames) {
        elm.removeAttribute("class");
    }
    elm.setAttribute("style", computedStyle.cssText);
}

export function getPageHidden(document: Document = window.document) {
    var hiddenPropName;
    if (typeof document.hidden !== "undefined") {
        // Opera 12.10 and Firefox 18 and later support
        hiddenPropName = "hidden";
    } else if (typeof (document as any).msHidden !== "undefined") {
        hiddenPropName = "msHidden";

    } else if (typeof (document as any).webkitHidden !== "undefined") {
        hiddenPropName = "webkitHidden";
    }

    return isString(hiddenPropName) ? document[hiddenPropName] : false;
}

export function getAnimationFlags() {
    var isSupported = false,
        animationstring = 'animation',
        keyframeprefix = '',
        domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
        pfx = '',
        elem = document.createElement('div');

    if (elem.style.animationName !== undefined) {
        isSupported = true;
    }

    if (isSupported === false) {
        for (var i = 0; i < domPrefixes.length; i++) {
            if (elem.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                pfx = domPrefixes[i];
                animationstring = pfx + 'Animation';
                keyframeprefix = '-' + pfx.toLowerCase() + '-';
                isSupported = true;
                break;
            }
        }
    }

    return {
        supported: isSupported,
        animationName: animationstring,
        keyFramePrefix: keyframeprefix,
        prefix: pfx
    };
}

export function getAnimationEndEventName() {
    var animations = {
        "animation": "animationend",
        "OAnimation": "oAnimationEnd",
        "MozAnimation": "animationend",
        "WebkitAnimation": "webkitAnimationEnd"
    };

    var flags = getAnimationFlags();

    if (flags.supported) {
        return animations[flags.animationName];
    }
}

export function isElement(ele: any): ele is HTMLElement {
    return !isNullOrUndefined(ele) && (ele.nodeType === 1 || ele instanceof Element);
}

export function isNode(ele: Element | Node) {
    return !isNullOrUndefined(ele) && ((ele.nodeName && ele.nodeType >= 1 && ele.nodeType <= 12) || ele instanceof Node);
}

export type ElementOrElemenctList = Element | HTMLElement | Element[] | HTMLElement[] | NodeListOf<HTMLElement> | NodeListOf<Element>;

function _eleOrSelectorToElementArray(eleOrSelector: string | ElementOrElemenctList) {
    if (isNullOrUndefined(eleOrSelector)) {
        return [];
    }

    var elements: HTMLElement[];

    if (isString(eleOrSelector)) {
        elements = Array.from(document.querySelectorAll(eleOrSelector) as NodeListOf<HTMLElement>);
    } else if (isElement(eleOrSelector as Element)) {
        elements = [eleOrSelector as HTMLElement];
    } else if (Array.isArray(eleOrSelector)) {
        elements = eleOrSelector as HTMLElement[];
    } else if ((eleOrSelector as NodeListOf<HTMLElement>).length
        || isFunction((eleOrSelector as NodeListOf<HTMLElement>).forEach)
        || eleOrSelector instanceof NodeList) {
        elements = Array.from(eleOrSelector as NodeList) as HTMLElement[];
    }

    return elements || [];
}

export function emptyHTMLElement(eleOrSelector: ElementOrElemenctList) {
    var elements = _eleOrSelectorToElementArray(eleOrSelector);

    elements.forEach((ele) => {
        if (ele && isElement(ele as Element) && ele.firstChild) {
            while (ele.firstChild) {
                try {
                    ele.removeChild(ele.firstChild);
                } catch (ex) {
                    break;
                }
            }
        }
    });
}

export function removeHTMLElement(eleOrSelector: ElementOrElemenctList) {
    var elements = _eleOrSelectorToElementArray(eleOrSelector);

    elements.forEach((ele) => {
        try {
            var parent = ele.parentNode || ele.parentElement;
            if (ele && isElement(ele as Element) && parent && parent.removeChild) {
                parent.removeChild(ele);
            }
        } catch (ex) {
        }
    });
}

export function removeAttributeFromHTMLElements(eleOrSelector: ElementOrElemenctList, attributeName: string) {
    var elements = _eleOrSelectorToElementArray(eleOrSelector);

    elements.forEach((elm) => {
        try {
            elm.removeAttribute(attributeName);
        } catch (ex) {
        }
    });
}

export function getSelectOptionByValue(selectElement: HTMLSelectElement, value: string) {
    if (isNullOrUndefined(selectElement) || isNullOrUndefined(value)) {
        return null;
    }
    var option = Array.from(selectElement.options).filter(o => {
        return o.value === value.toString();
    })[0];

    return option;
}

export function getSelectOptionByIndex(selectElement: HTMLSelectElement, index: number) {
    if (isNullOrUndefined(selectElement) || !isNumeric(index)) {
        return null;
    }
    return selectElement.options[Number(index)];
}

export function getSelectedOption(selectElement: HTMLSelectElement) {
    if (isNullOrUndefined(selectElement)) {
        return null;
    }

    return selectElement.options[selectElement.selectedIndex] || Array.from(selectElement.options).filter((option) => {
        return option.selected;
    })[0];
}

export function setSelectOptionByValue(selectElement: HTMLSelectElement, value: string): HTMLOptionElement {
    var option = getSelectOptionByValue(selectElement, value);

    if (option) {
        option.selected = true;
        return option;
    }

    return null;
}

export function setSelectOptionByIndex(selectElement: HTMLSelectElement, index: number): HTMLOptionElement {
    if (isNullOrUndefined(selectElement) || !isNumeric(index)) {
        return null;
    }

    var option = selectElement.options[Number(index)];

    if (option) {
        option.selected = true;
        return option;
    }

    return null;
}

export function composePath(evt: Event) {
    var path = (isFunction(evt["composedPath"]) && evt["composedPath"]()) || (evt as any).path as EventTarget[],
        target = evt.target;

    if (path !== null) {
        // Safari doesn't include Window, and it should.
        path = (path.indexOf(window) < 0) ? path.concat([window]) : path;
        return path;
    }

    if (target === window) {
        return [window];
    }

    function getParents(node, memo?) {
        memo = memo || [];
        var parentNode = node.parentNode;

        if (!parentNode) {
            return memo;
        }
        else {
            return getParents(parentNode, memo.concat([parentNode]));
        }
    }

    return [target].concat(getParents(target)).concat([window]);
}

/** timeouts after 10 seconds by default */
export function waitForWindowObject(typeFullName: string, windowOrParent?: Window | any, timeout = 10000): Promise<boolean> {
    return waitFor(() => !isTypeofFullNameNullOrUndefined(typeFullName, windowOrParent), timeout);
}

/** timeouts after 10 seconds by default */
export function waitFor(checker: () => boolean, timeout = 10000, intervalLength = 50): Promise<boolean> {
    return new Promise((resolve, reject) => {
        var timeoutId: number = null;

        var max = Math.round(timeout / intervalLength);
        var count = 0;
        var exists = false;

        var _retry = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            try {
                exists = checker();
            } catch (ex) {
                resolve(false);
                return;
            }

            if (exists || count > max) {
                resolve(exists);
            } else {
                timeoutId = window.setTimeout(_retry, intervalLength);
            }

            count++;
        };

        _retry();
    });
}

/**
 * Waits for an async check to return true or times out.
 * @param checker           Async function that returns boolean result.
 * @param timeout           The timeout in milliseconds. Defaults to 10000ms.
 * @param intervalLength    The interval length in milliseconds to retry the checker function. Defaults to 50ms.
 */
export async function waitForAsync(checker: () => Promise<boolean>, timeout = 10000, intervalLength = 50) {
    var max = Math.round(timeout / intervalLength);
    var count = 0;
    var exists = false;

    for (var count = 0; count < max; count++) {
        exists = await checker();
        if (exists) {
            break;
        }
        await delayAsync(intervalLength);
    }

    return exists;
}

/**
 * An async function that returns after a set delay.
 * @param delay The delay in milliseconds. Defaults to 500ms.
 */
export function delayAsync(delay = 500) {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(null);
        }, delay);
    });
}

export interface IElementCreationOptions<T> {
    attributes?: { [attribName: string]: string; };
    properties?: { [K in keyof T]?: T[K] };
    style?: { [P in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[P] };
}

export function addStyleSheet(options?: IElementCreationOptions<HTMLLinkElement>, doc?: Document) {
    doc = doc || document;
    var head = doc.head || doc.getElementsByTagName("head")[0];
    if (head) {
        var link = createStylesheet(options, doc);
        head.appendChild(link);
    }
}

export function createStylesheet(options?: IElementCreationOptions<HTMLLinkElement>, doc?: Document) {
    doc = doc || document;

    options = options || {};
    options.properties = {
        ...{
            type: "text/css",
            rel: "stylesheet",
        },
        ...options.properties
    };

    return createHtmlElement<HTMLLinkElement>("link", options, doc);
}

export function createHtmlElement<T extends HTMLElement>(tagName: string, options?: IElementCreationOptions<T>, doc?: Document) {
    doc = doc || document;
    var element = doc.createElement(tagName) as HTMLElement;

    if (options) {
        if (options.attributes) {
            Object.keys(options.attributes).forEach((attribName) => {
                var attribValue = options.attributes[attribName];
                if (!isNullOrUndefined(attribValue)) {
                    element.setAttribute(attribName, attribValue);
                }
            });
        }
        if (options.properties) {
            var mergedProps = {
                ...(options.properties as IDictionary<any>),
                ...{
                    style: options.style
                }
            };

            Object.keys(mergedProps).forEach((propName) => {
                var obj = mergedProps[propName];
                if (!isNullOrUndefined(obj)) {
                    if (isString(obj) || isBoolean(obj) || isNumber(obj)) {
                        element[propName] = obj;
                    } else {
                        if (!element[propName]) {
                            element[propName] = obj;
                        } else {
                            Object.keys(obj).forEach((objName) => {
                                element[propName][objName] = obj[objName];
                            });
                        }
                    }
                }
            });
        }
    }

    return element as T;
}

export function isInsideIFrame(win?: Window) {
    win = win || window;
    try {
        return win.parent.location !== win.location;
    } catch (ex) {
        return true;
    }
}

export function isIFrameAccessible(iframeEle: HTMLIFrameElement) {
    try {
        var location = (iframeEle.contentWindow || iframeEle.contentDocument).location;
        return location && location.origin ? true : false;
    } catch (ex) {
        return false;
    }
}

export function HTMLEncode(d: string) {
    if (isNullOrEmptyString(d)) {
        return "";
    }
    var tempString = String(d);
    var result: string[] = [];

    for (var index = 0; index < tempString.length; index++) {
        var char = tempString.charAt(index);
        switch (char) {
            case "<":
                result.push("&lt;");
                break;
            case ">":
                result.push("&gt;");
                break;
            case "&":
                result.push("&amp;");
                break;
            case '"':
                result.push("&quot;");
                break;
            case "'":
                result.push("&#39;");
                break;
            default:
                result.push(char);
        }
    }
    return result.join("");
}

export function HTMLDecode(a) {
    if (isNullOrEmptyString(a)) {
        return "";
    }
    var e = [/&lt;/g, /&gt;/g, /&quot;/g, /&#39;/g, /&#58;/g, /&#123;/g, /&#125;/g, /&amp;/g];
    var f = ["<", ">", '"', "'", ":", "{", "}", "&"];
    var d: string[] = [];
    for (var c = 0; c < e.length; c++) {
        var b = a.indexOf("&");
        if (b !== -1) {
            if (b > 0) {
                d.push(a.substr(0, b));
                a = a.substr(b);
            }
            a = a.replace(e[c], f[c]);
        } else {
            break;
        }
    }
    d.push(a);
    return d.join("");
}

export function ScriptEncode(e) {
    if (null === e || typeof e === "undefined")
        return "";
    for (var d = String(e), a = [], c = 0, g = d.length; c < g; c++) {
        var b = d.charCodeAt(c);
        if (b > 4095)
            a.push("\\u" + b.toString(16).toUpperCase());
        else if (b > 255)
            a.push("\\u0" + b.toString(16).toUpperCase());
        else if (b > 127)
            a.push("\\u00" + b.toString(16).toUpperCase());
        else {
            var f = d.charAt(c);
            switch (f) {
                case "\n":
                    a.push("\\n");
                    break;
                case "\r":
                    a.push("\\r");
                    break;
                case '"':
                    a.push("\\u0022");
                    break;
                case "%":
                    a.push("\\u0025");
                    break;
                case "&":
                    a.push("\\u0026");
                    break;
                case "'":
                    a.push("\\u0027");
                    break;
                case "(":
                    a.push("\\u0028");
                    break;
                case ")":
                    a.push("\\u0029");
                    break;
                case "+":
                    a.push("\\u002b");
                    break;
                case "/":
                    a.push("\\u002f");
                    break;
                case "<":
                    a.push("\\u003c");
                    break;
                case ">":
                    a.push("\\u003e");
                    break;
                case "\\":
                    a.push("\\\\");
                    break;
                default:
                    a.push(f);
            }
        }
    }
    return a.join("");
}

export function addEventListeners(eles: ElementOrElemenctList, events: string | string[], listener: (evt: Event) => void, useCapture = false) {
    if (!isFunction(listener)) {
        return;
    }

    var eventNames: string[];
    if (isString(events)) {
        eventNames = (events as string).split(" ");
    } else if (Array.isArray(events)) {
        eventNames = events;
    }

    if (isNullOrEmptyArray(eventNames)) {
        return;
    }

    var elements = _eleOrSelectorToElementArray(eles);

    if (isNullOrEmptyArray(elements)) {
        return;
    }

    elements.forEach((ele) => {
        if (isElement(ele) && isFunction(ele.addEventListener)) {
            eventNames.forEach((eventName) => {
                ele.addEventListener(eventName, listener, useCapture);
            });
        }
    });
}

/** defer calling this function multiple times within X time frame to execute only once after the last call */
export function debounce<T extends (...args) => void>(callback: T, ms: number, thisArg: any = null): T {
    let timeoutId = null;
    let func = (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback.apply(thisArg, args);
        }, ms);
    };
    return func as any;
}

/** call a funciton X number of times, on a specific interval. */
export function interval<T extends () => void>(callback: T, msBetweenCalls: number, numberOfTimesToCall: number, thisArg: any = null) {
    for (let index = 1; index <= numberOfTimesToCall; index++)
        window.setTimeout(() => { callback.apply(thisArg); }, msBetweenCalls * index);
}

/** throttle repeated calls to callback, makes sure it is only called once per *wait* at most, but won't defer it for longer than that.
 * Unlike debounce, which can end up waiting for 5 minutes if it is being called repeatedly.
 */
export function throttle<T extends (...args) => any>(callback: T, wait = 250, thisArg: any = null): T {
    let previous = 0;
    let timeout: number | null = null;
    let result: any;
    let storedContext = thisArg;
    let storedArgs: any[];

    const later = (): void => {
        previous = Date.now();
        timeout = null;
        result = callback.apply(storedContext, storedArgs);

        if (!timeout) {
            storedArgs = [];
        }
    };

    let wrapper = (...args: any[]) => {
        const now = Date.now();
        const remaining = wait - (now - previous);

        storedArgs = args;

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }

            previous = now;
            result = callback.apply(storedContext, storedArgs);

            if (!timeout) {
                storedArgs = [];
            }
        } else if (!timeout) {
            timeout = window.setTimeout(later, remaining);
        }

        return result;
    };
    return wrapper as T;
}

var _resizeHandlers: IDictionary<() => void> = {};
var _resizeRegistered = false;
function _handleResize() {
    Object.keys(_resizeHandlers).forEach(key => {
        try { _resizeHandlers[key](); }
        catch (e) { }
    });
}
/** allows you to register, re-register or remove a resize handler without ending up with multiple registrations. */
export function OnWindowResize(handlerID: string, handler: () => void) {
    if (!isNullOrUndefined(handler))
        _resizeHandlers[handlerID] = handler;
    else delete _resizeHandlers[handlerID];

    if (!_resizeRegistered) {
        _resizeRegistered = true;
        addEventHandler(window, "resize", debounce(_handleResize, 250));
    }
}

export function dispatchCustomEvent<T>(obj: HTMLElement | Window | Document, eventName: string, params: { bubbles?: boolean; cancelable?: boolean; detail?: T; } = { bubbles: false, cancelable: false, detail: null }) {
    if (isNullOrUndefined(obj) || !isFunction(obj.dispatchEvent)) {
        return;
    }
    params.bubbles = params.bubbles || false;
    params.cancelable = params.cancelable || false;
    params.detail = params.detail || null;

    let event: CustomEvent<T> = null;
    if (isFunction(window.CustomEvent)) {
        event = new CustomEvent(eventName, params);
    } else {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, params.bubbles, params.cancelable, params.detail);
    }

    obj.dispatchEvent(event);
}

export function addStyleElement(cssText: string, id?: string) {
    var parent = document.head || document.getElementsByTagName("head")[0] || document;
    let cssElm: HTMLStyleElement = !isNullOrEmptyString(id) ? document.getElementById(id) as HTMLStyleElement : null;
    if (!cssElm) {
        cssElm = document.createElement("style");
        if (!isNullOrEmptyString(id))
            cssElm.id = id;
        parent.appendChild(cssElm);
    }

    cssElm.innerHTML = cssText;

    return cssElm;
}

export function getReactInstanceFromElement(node) {
    if (!isNullOrUndefined(node)) {
        for (const key in node) {
            if ((key).startsWith("__reactInternalInstance$") || key.startsWith("__reactFiber$")) {
                return node[key];
            }
        }
    }
    return null;
}

/** registers a listener to when the browser url changed */
export function registerUrlChanged(callback: () => void) {
    if (!_global.registerUrlChangedCallbacks.includes(callback)) {
        _global.registerUrlChangedCallbacks.push(callback);
    }

    if (_global.urlChangedHandlerRegistered === false) {
        _global.urlChangedHandlerRegistered = true;

        let executeCallbacks = () => {
            _global.registerUrlChangedCallbacks.forEach((callbackFunc) => {
                try {
                    if (isFunction(callbackFunc)) {
                        callbackFunc();
                    }
                } catch { }
            })
        };

        if ("navigation" in window && isFunction((window.navigation as any).addEventListener)) {
            (window.navigation as any).addEventListener("navigate", executeCallbacks);
        } else {
            let url = window.location.href;

            window.setInterval(() => {
                if (url !== window.location.href) {
                    url = window.location.href;
                    executeCallbacks();
                }
            }, 500);
        }
    }
}

export const DisableAnchorInterceptAttribute = "data-interception";
export const DisableAnchorInterceptValue = "off";
export function DisableAnchorIntercept(link: HTMLAnchorElement) {
    link.setAttribute(DisableAnchorInterceptAttribute, DisableAnchorInterceptValue);
}
/** go over HTML and add  data-interception="off" to all <a> tags. */
export function DisableAnchorInterceptInHtml(html: string) {
    return html.replace(/<a /g, `<a ${DisableAnchorInterceptAttribute}="${DisableAnchorInterceptValue}" `);
}
/** adding the disable attribute to all a links in the container that do not already have them. returning the number of links that were disabled (not ones that were already disabled before) */
export function DisableAnchorInterceptInElement(container: ParentNode) {
    var links = container.querySelectorAll<HTMLAnchorElement>(`a:not([${DisableAnchorInterceptAttribute}='${DisableAnchorInterceptValue}'])`);
    links.forEach(link => DisableAnchorIntercept(link));
    return links.length;
}

export function isChildOf(node: HTMLElement, parent: {
    /** parent has one of those classes */
    class?: string | string[];
    id?: string | string[];
    tagName?: string | string[];
}) {
    let classes = (isNotEmptyString(parent.class) ? [parent.class] : isNotEmptyArray(parent.class) ? parent.class : []).map(c => `.${c}`);
    let ids = (isNotEmptyString(parent.id) ? [parent.id] : isNotEmptyArray(parent.id) ? parent.id : []).map(id => `#${id}`);
    let tagNames = (isNotEmptyString(parent.tagName) ? [parent.tagName.toUpperCase()] : isNotEmptyArray(parent.tagName) ? parent.tagName : []).map(tagName => `${tagName.toUpperCase()}`);

    let queySelectorText = [...classes, ...ids, ...tagNames].join(',');
    if (isNullOrEmptyString(queySelectorText)) return true;

    if (node instanceof HTMLElement)
        return node.closest(queySelectorText) ? true : false;
    else
        return false;
}

export function findAcestor(ele: HTMLElement, predicate: (ele2: HTMLElement) => boolean) {
    if (!isElement(ele) || !isFunction(predicate)) {
        return null;
    }
    while (ele) {
        if (predicate(ele)) {
            return ele;
        }
        ele = ele.parentElement;
    }
    return null;
}

export function loadModernFormsCSS() {
    let styleElm = document.getElementById('kw_modernui_css') as HTMLLinkElement;
    if (!styleElm) {
        styleElm = document.createElement("link");
        styleElm.id = "kw_modernui_css";
        styleElm.rel = "stylesheet";
        styleElm.href = "https://apps.kwizcom.com/products/modern/css/app.min.css";
        document.head.appendChild(styleElm);
    }
}

interface ILoadingOverlayOptions {
    bgColor?: string;
    innerHtml?: string;
}
export function showLoadingOverlay(elm: HTMLElement, options?: ILoadingOverlayOptions) {
    let overlay = elm.querySelector('.kw-loading-overlay') as HTMLDivElement;
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "kw-loading-overlay";
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.bottom = "0";
        overlay.style.zIndex = "9999999";
        overlay.style.display = "flex";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.height = "100%";
        overlay.style.width = "100%";
        elm.appendChild(overlay);
    }
    overlay.innerHTML = options && options.innerHtml || `<img src="${LOGO_ANIM}" style="max-width: 30%;max-height: 30%;">`;
    overlay.style.backgroundColor = options && options.bgColor || "white";
}
export function hideLoadingOverlay(elm: HTMLElement) {
    if (isElement(elm)) {
        let overlays = Array.from(elm.querySelectorAll('.kw-loading-overlay')) as HTMLDivElement[];
        removeHTMLElement(overlays);
    }
}
export function getLoadingOverlayHtml(options?: ILoadingOverlayOptions) {
    let overlay = document.createElement("div");
    showLoadingOverlay(overlay, options);
    return overlay.innerHTML;
}

export function getUniqueElementId(id: string = "") {
    return `${id}${getUniqueId()}`;
}

export function stopEvent(e: {
    preventDefault(): void;
    stopPropagation(): void;
}) {
    e.stopPropagation && e.stopPropagation();
    e.preventDefault && e.preventDefault();
}

/** send in --color or var(--color) and get the computed value for an element */
export function getCSSVariableValue(value: string, elm: HTMLElement = document.body) {
    if (value.startsWith("var("))
        value = value.slice(4, value.length - 1);
    if (value.startsWith("--")) {
        var style = getComputedStyle(elm)
        var varValue = style.getPropertyValue(value);
        if (!isNullOrEmptyString(varValue))
            return varValue;
    }
    return value;
}

/** 
 * Converts an HTMLImageElement/SVGImageElement to base 64 and resizes the image to the exact dimensions of the element.
 * The following image types are supported: jpg, jpeg, gif, png, webp, bmp
 */
export async function convertImageToBase64(imgEle: HTMLImageElement | SVGImageElement, quality: ImageSmoothingQuality = "medium"): Promise<string> {
    if (!isElement(imgEle)
        || (isNullOrEmptyString(imgEle.src) && isNullOrEmptyString(imgEle.getAttribute("xlink:href")))) {
        return null;
    }

    return new Promise((resolve) => {
        let xlinkHref = imgEle.getAttribute("xlink:href");
        let useXlinkHref = !isNullOrEmptyString(xlinkHref);
        let src = useXlinkHref ? xlinkHref : imgEle.src;

        let type = "image/png"
        if (!isDataUrl(src)) {
            let ext = getURLExtension(src);
            if (!isNullOrEmptyString(ext)) {
                ext = ext.toLowerCase();
                if (ext !== "png") {
                    type = "image/jpeg";
                }
            }
        }

        let height = 0;
        let width = 0;

        if (imgEle instanceof SVGImageElement || useXlinkHref || imgEle.tagName === "image") {
            width = parseInt(imgEle.getAttribute("width"));
            height = parseInt(imgEle.getAttribute("height"));
        } else {
            width = imgEle.width;
            height = imgEle.height;
        }

        let canvas = document.createElement("canvas");
        canvas.height = height;
        canvas.width = width;

        let ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = quality;

        let isCrossOrigin = !src.toLowerCase().startsWith(window.location.origin.toLowerCase());
        let crossOriginImg = new Image();

        crossOriginImg.onload = () => {
            let dataURL: string = null;
            try {
                ctx.drawImage(crossOriginImg, 0, 0, width, height);
                dataURL = canvas.toDataURL(type, quality === "high" ? 1 : quality === "medium" ? 0.75 : 0.5);
            } catch {
                dataURL = null;
            }

            canvas = null;
            ctx = null;
            crossOriginImg = null;

            resolve(dataURL);
        };

        crossOriginImg.onerror = () => {
            canvas = null;
            ctx = null;
            crossOriginImg = null;

            resolve(null);
        };

        if (isCrossOrigin === true) {
            crossOriginImg.crossOrigin = "anonymous";
        } else {
            crossOriginImg.crossOrigin = "use-credentials";
        }

        crossOriginImg.src = src;
    });
}