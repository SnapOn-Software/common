var _objectTypes = {
    "Function": typeof (() => {/*empty*/ }),
    "Undefined": typeof (undefined),
    "String": typeof (""),
    "Number": typeof (1),
    "Object": typeof ({}),
    "Boolean": typeof (true)
};

/** check if a global object in that full name exists and return its type or "undefined" */
export function typeofFullName(fullName: string, windowOrParent?: Window | any) {
    //todo: possible to merge with getFromFullName, but we need to distinguish between null and undefined

    if (!fullName) {
        return _objectTypes.Undefined;
    }
    try {
        let names = fullName.split(".");
        let len = names.length;
        let obj = windowOrParent || window;

        for (var i = 0; i < len; i++) {
            obj = obj[names[i]];
            if (typeof obj === _objectTypes.Undefined)
                return _objectTypes.Undefined;
            if (obj === null && i < len - 1)//one of the chained objects (not the leaf) is null - so return undefined
                return _objectTypes.Undefined;
        }
        return typeof obj;
    } catch (ex) {
        return _objectTypes.Undefined;
    }
}

/** get the value by full name of property */
export function getFromFullName<T>(fullName: string, windowOrParent?: Window | any) {
    try {
        if (isNullOrEmptyString(fullName)) {
            return null;
        }
        try {
            var names = fullName.split(".");
            var len = names.length;
            var obj = windowOrParent || window;

            for (var i = 0; i < len; i++) {
                obj = obj[names[i]];
                if (typeof obj === _objectTypes.Undefined || obj === null) {
                    return null;
                }
            }
            return <T>obj;
        } catch (ex) {
        }
    } catch (e) { }
    return null;
}

export function isTypeofFullNameObject(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.Object;
}

export function isTypeofFullNameString(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.String;
}

export function isTypeofFullNameNumber(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.Number;
}

export function isTypeofFullNameNullOrUndefined(fullName: string, windowOrParent?: Window | any): boolean {
    if (typeofFullName(fullName, windowOrParent) === _objectTypes.Undefined) {
        return true;
    }

    try {
        var names = fullName.split(".");
        var len = names.length;
        var obj = windowOrParent || window;

        for (var i = 0; i < len && obj !== null; i++) {
            obj = obj[names[i]];
        }

        return obj === null || obj === undefined;
    } catch (ex) {
        return true;
    }
}

export function isTypeofFullNameUndefined(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.Undefined;
}

export function isTypeofFullNameFunction(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.Function;
}

export function isTypeofFullNameBoolean(fullName: string, windowOrParent?: Window | any): boolean {
    return typeofFullName(fullName, windowOrParent) === _objectTypes.Boolean;
}

export function isType(obj: any, str: string) {
    return typeof (obj) === str;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isObject(obj: any): obj is object {
    return isType(obj, _objectTypes.Object);
}

/** Checks if obj is empty - as primitive, array or object 
 * If an object, pass an optional array of keys to ignore
*/
export function isEmptyObject(obj: any, options?: { ignoreKeys?: string[] }) {
    let ignoreKeys = options && options.ignoreKeys || [];
    return isNullOrUndefined(obj) || (Array.isArray(obj) && obj.length === 0) ||
        (isObject(obj) && Object.keys(obj)
            //if options.ignoreKeys is not empty - only include keys that are NOT in this array
            .filter(key => SafeIfElse(() => ignoreKeys.indexOf(key) < 0, true))
            .length === 0);
}

export function isNullOrUndefined(obj: any) {
    return isUndefined(obj) || obj === null;
}

/** return true if o is undefined, null or not a number */
export function isNullOrNaN(o: any): boolean {
    return isNullOrEmptyString(o) || isNaN(o);
}

/** return true if o is undefined, null or empty string */
export function isNullOrEmptyString(o: any): o is null | undefined | "" {
    return isNullOrUndefined(o) || o === '';
}

/** o is an array that is not empty (length > 0) */
export function isNotEmptyArray(o: any): o is any[] {
    return Array.isArray(o) && o.length > 0;
}
/** o is undefined, null or an empty array  */
export function isNullOrEmptyArray(o: any): boolean {
    return isNullOrUndefined(o) || (Array.isArray(o) && o.length < 1);
}

export function isString(obj: any): obj is string {
    return isType(obj, _objectTypes.String);
}

export function isNotEmptyString(obj: any): obj is string {
    return isString(obj) && obj.length > 0;
}

/** true if object is a Date object */
export function isDate(obj: any): obj is Date {
    return !isNullOrUndefined(obj) && isFunction(obj.getTime) && !isNullOrNaN((obj as Date).getTime());
}

/** true if obj is a number or a numeric string */
export function isNumeric(obj: any): obj is number | string {
    return !isNullOrEmptyString(obj) && !Array.isArray(obj) &&//[14] will return true, since [14].toString() is "14"
        !isNaN(parseFloat(obj as string)) && isFinite(obj as number) && isType(Number(obj), _objectTypes.Number);
}
/** true if obj is a number */
export function isNumber(obj?: any): obj is number {
    return !isNullOrNaN(obj) && isType(obj, _objectTypes.Number);
}

export function isNumberArray(obj: any[]): obj is number[] {
    return !isNullOrUndefined(obj) && Array.isArray(obj) && obj.every((entry) => {
        return isNumber(entry);
    });
}

export function isUndefined(obj: any): obj is undefined {
    return isType(obj, _objectTypes.Undefined);
}

//eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(obj: any): obj is Function {
    return isType(obj, _objectTypes.Function);
}

export function isBoolean(obj: any): obj is boolean {
    return isType(obj, _objectTypes.Boolean);
}

export function isPromise<t>(obj: any): obj is Promise<t> {
    return obj && isFunction(obj["then"]);
}

export type primitiveTypes = string | number | Date | boolean | null;
/**returns true if object is string, number, date, boolean value or null*/
export function isPrimitiveValue(obj: any): obj is primitiveTypes {
    return isNullOrUndefined(obj) || isString(obj) || isNumber(obj) || isDate(obj) || isBoolean(obj);
}

export function isValidGuid(str: string) {
    var a = new RegExp("^[{|\\(]?[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}[\\)|}]?$");
    return !!a.exec(str);
}

export var BoolTrueStrings = ["true", "1", "on", "yes"];
export var BoolFalseStrings = ["false", "0", "off", "no"];
export function isTrueString(str: string, options?: { allowPositiveNumbers?: boolean; }) {
    if (isNullOrEmptyString(str)) return false;
    else if (BoolTrueStrings.includes(str.toLowerCase()))
        return true;
    else if (options && options.allowPositiveNumbers && isNumeric(str))
        return Number(str) > 0;//any number greater than 0 is considered true.
    else return false;
}

export function newGuid() {
    var S4 = () => {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    // then to call it, plus stitch in '4' in the third group
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

/** check if object has all members (they are not undefined) */
export function hasMembers(o: any, ...members: string[]) {
    if (!isNullOrUndefined(o)) {
        for (let i = 0; i < members.length; i++)
            if (isUndefined(o[members[i]]))
                return false;
        return true;//not null and all members exist
    }
    return false;
}

/** compares 2 versions. if v1 is bigger return 1, if v2 is bigger returns -1, if equals return 0 */
export function CompareVersion(v1: string, v2: string) {
    let v1Split = v1 && v1.split('.').map(s => parseInt(s, 10)) || [];
    let v2Split = v2 && v2.split('.').map(s => parseInt(s, 10)) || [];

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        let p1 = v1Split[i];
        let p2 = v2Split[i];
        if (isNaN(p1)) p1 = -1;
        if (isNaN(p2)) p2 = -1;

        if (p1 > p2) return 1;
        else if (p1 < p2) return -1;
    }
    //finished while equal? return 0
    return 0;
}

/** pass along a list of unsafe tests to get a value, the first one that doesn't throw an exception and doesnt return null will get returned */
export function SafeIfElse<T>(...list: ((() => T) | T)[]) {
    for (let i = 0; i < list.length; i++) {
        let v: T = null;
        let getter = list[i];
        if (isFunction(getter)) {
            try {
                v = getter();
            } catch (e) { v = null; }
        }
        else v = getter;

        if (!isNullOrUndefined(v)) return v;
    }
    return null;
}