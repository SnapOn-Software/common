import { IDictionary } from "../types/common.types";

type postMessagePrimitive = string | number | boolean | null | undefined | bigint;
type postMessageValue =
    | postMessagePrimitive
    | Date
    | RegExp
    | ArrayBuffer
    | ArrayBufferView
    | Blob
    | File
    | postMessageValue[]
    | Map<postMessageValue, postMessageValue>
    | Set<postMessageValue>
    | { [key: string]: postMessageValue };

type generic = {
    type: string;
} & IDictionary<postMessageValue>;

type resize = {
    type: "SOS_RESIZE_IFRAME";
    height: number;
    params?: IDictionary<postMessageValue>;
};
type visible = {
    type: "SOS_VISIBILITY_CHANGE";
    isVisible: boolean;
    params?: IDictionary<postMessageValue>;
};

type syncPostMessageValues = resize | visible;
type knownPostMessageType = syncPostMessageValues["type"];
type customPostMessageType = string & {};
type genericMessage<T extends customPostMessageType> = Omit<generic, "type"> & {
    type: T extends knownPostMessageType ? never : T;
};

/** Listen to a known message type */
export function postMessageListener<T extends knownPostMessageType>(
    type: T,
    handler: (data: Extract<syncPostMessageValues, { type: T }>) => void
): { dispose: () => void };
/** Listen to an unknown message type - you must send in a value for T that has a type that matches the type parameter. For example:
 * postMessageListener<{ type: "m1", param: number }>("m1", data => console.log(data.param));
 */
export function postMessageListener<T extends genericMessage<customPostMessageType> = never>(
    type: T["type"] extends knownPostMessageType ? never : T["type"],
    handler: (data: T) => void
): { dispose: () => void };
export function postMessageListener(
    type: string,
    handler: (data: any) => void
) {
    const listener = (event: MessageEvent<any>) => {
        if (event.data && event.data.type === type) {
            handler(event.data);
        }
    };

    window.addEventListener("message", listener, false);

    return {
        /** in case you want to dispose of it */
        dispose: () => {
            window.removeEventListener("message", listener, false);
        }
    };
}

/** Send a known message type */
export function postMessageSender<T extends knownPostMessageType>(
    /** window.parent, window.top, or iframe ID */
    target: Window | HTMLIFrameElement,
    data: Extract<syncPostMessageValues, { type: T }>
): void;
/** Send an unknown message type, data value will be generic */
export function postMessageSender<T extends customPostMessageType = never>(
    /** window.parent, window.top, or iframe ID */
    target: Window | HTMLIFrameElement,
    data: genericMessage<T>
): void;
export function postMessageSender(
    /** window.parent, window.top, or iframe ID */
    target: Window | HTMLIFrameElement,
    data: syncPostMessageValues | generic
) {
    let targetWindow = target instanceof HTMLIFrameElement
        ? target.contentWindow
        : target;

    targetWindow.postMessage(data, '*');
}

/** Types were carefully constructed to allow caller to have auto complete options for type while being able to pass other values
 * postMessageSender(window, { type: "xxx", a: 1 });
 * postMessageSender(window, { type: "SOS_RESIZE_IFRAME", height: 1 });
 * postMessageSender(window, { type: "SOS_VISIBILITY_CHANGE", isVisible: false });
 * and
 * postMessageListener("SOS_RESIZE_IFRAME", data => data.height);
 * postMessageListener<{ type: "xxx", param: number }>("xxx", data => {
 *     console.log(data.param);
 * });
 */