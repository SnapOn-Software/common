type resize = {
    type: "SOS_RESIZE_IFRAME";
    height: number;
};
type visible = {
    type: "SOS_VISIBILITY_CHANGE";
    isVisible: boolean;
};

type syncPostMessageValues = resize | visible;

export function postMessageListener<T extends syncPostMessageValues["type"]>(
    type: T,
    handler: (data: Extract<syncPostMessageValues, { type: T }>) => void
) {
    const listener = (event: MessageEvent<syncPostMessageValues>) => {
        if (event.data && event.data.type === type) {
            handler(event.data as Extract<syncPostMessageValues, { type: T }>);
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

export function postMessageSender(
    /** window.parent, window.top, or iframe ID */
    target: Window | HTMLIFrameElement,
    data: syncPostMessageValues
) {
    let targetWindow = target instanceof HTMLIFrameElement
        ? target.contentWindow
        : target;

    targetWindow.postMessage(data, '*');
}
