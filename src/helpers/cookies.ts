import { trim } from "./strings";
import { isNullOrEmptyString, isNumeric, isString } from "./typecheckers";

var _zeroDay = new Date(0);
var _today = new Date();

export function deleteCookie(cookieName: string, path?: string) {
    setCookie(cookieName, "", null, path);
}

export function getAllCookies(prefix?: string): string[] {
    let cookies = document.cookie.split(';');
    let names: string[] = [];
    for (var k = 0; k < cookies.length; k++) {
        let cookieSplit = cookies[k].split('=');
        let cookieName = trim(cookieSplit[0]);
        if (isNullOrEmptyString(prefix) || cookieName.indexOf(prefix) === 0)
            names.push(cookieName);
    }
    return names;
}

/** get a cookie's value by that name, or null */
export function getCookie(cookieName: string) {
    try {
        let cookies = document.cookie.split(';');
        for (var k = 0; k < cookies.length; k++) {
            let cookieSplit = cookies[k].split('=');
            if (trim(cookieSplit[0]) === cookieName) {
                return decodeURIComponent(trim(cookieSplit[1]));
            }
        }
    } catch (e) { }
    return null;
}
/** set a cookie by that name and value. if you do not send expireDays, it will be a session cookie (in memory) */
export function setCookie(name: string, value: string, expireDays?: number, path?: string) {
    var cookie: string[] = [];

    var cookieValue = `${name}=${isString(value) ? value : ""}`;
    cookie.push(cookieValue);

    if (isNumeric(expireDays)) {
        var d = new Date();
        d.setTime(d.getTime() + (expireDays * 24 * 60 * 60 * 1000));
        var cookieExpires = "expires=" + d.toUTCString();
        cookie.push(cookieExpires);
    }

    var cookiePath = `${isString(path) ? `path=` + path : "path=/"}`;
    cookie.push(cookiePath);

    document.cookie = cookie.join(";");
}

export function cookieEnabled() {
    let enabled = "navigator" in globalThis && navigator.cookieEnabled === true;
    return enabled;
}