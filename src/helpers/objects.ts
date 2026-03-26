import { makeUniqueArray } from "./collections.base";
import { jsonParse } from "./json";
import { isDate, isFunction, isNotEmptyArray, isNullOrEmptyString, isNullOrUndefined, isObject, isPrimitiveValue, isString, primitiveTypes } from "./typecheckers";

/** global window, safe for testing and environments without a browser */
export var $w = typeof window === "undefined" ? {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    location: {
        href: "", host: ""
    }
} as any as Window : window;

/** wrapper for hasOwnProperty that satisfies https://eslint.org/docs/latest/rules/no-prototype-builtins */
export function hasOwnProperty(obj: any, prop: string) {
    if (!isNullOrUndefined(obj)) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    return false;
}

/** empty async function */
/* eslint-disable-next-line @typescript-eslint/no-empty-function */
export var noop = async () => { };
/** empty sync function */
/* eslint-disable-next-line @typescript-eslint/no-empty-function */
export var noops = () => { };

/** get or create kwizcom object from top window or current window, set allowFromTop if you want to try to get from window.top */
export function getKWizComGlobal(allowFromTop?: boolean) {
    if (allowFromTop) {
        try {
            $w.top["kwizcom"] = $w.top["kwizcom"] || {};
            return $w.top["kwizcom"] as IKWizComGlobals;
        } catch (ex) { }
    }
    $w["kwizcom"] = $w["kwizcom"] || {};
    return $w["kwizcom"] as IKWizComGlobals;
}
/** get or create kwizcom.globals dictionary from top window or current window. Add or return key:name initialize as defaults or blank object if does not already exist */
export function getGlobal<T>(name: string, defaults?: T, notFromTop?: boolean) {
    var kGlobal = getKWizComGlobal(notFromTop !== true);
    kGlobal.globals = kGlobal.globals || {};

    if (!kGlobal.globals[name]) {
        if (isObject(defaults)) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            kGlobal.globals[name] = { ...(defaults as object) };
        } else {
            kGlobal.globals[name] = {};
        }
    }
    return kGlobal.globals[name] as T;
}

/**
 * Automatically bind all functions of instance to instance
 * Note: if you use knockout, you should skip ko.isObservable
 * @param instance
 */
//eslint-disable-next-line @typescript-eslint/ban-types
export function autoBind(instance: any, skip?: (name: string, f: Function) => boolean) {
    let funcitonNames = getAllFunctionNames(instance, 1);
    funcitonNames.forEach(prop => {
        const val = instance[prop];
        if (!isFunction(skip) || !skip(prop, val))
            instance[prop] = val.bind(instance);
    });
}

/** Implements Object.assign which does not exist in IE
 *  Copies properties over from overrides into original object
 *  Merge default and override settings: var merged = assign({},defaults,props)
 *  Create deep copy of object by var copy = assign({},obj) */
export function assign<T>(original: Partial<T>, ...overrides: Partial<T>[]): T {
    if (original === undefined || original === null) {
        throw new TypeError('Cannot convert first argument to object');
    }

    var to = Object(original);
    if (overrides && overrides.length > 0)
        overrides.forEach(o => {
            if (!isNullOrUndefined(o)) {
                var keysArray = Object.keys(Object(o));
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(o, nextKey);
                    if (typeof (desc.value) === "undefined" || desc.value === null) {
                        to[nextKey] = desc.value;
                    }
                    else if (typeof (desc.value) === "object") {
                        //reference type, call assign  recursively. fixed problem that object value types from overrides were modified when the returnd object was modified.
                        if (!Array.isArray(desc.value)) {
                            to[nextKey] = assign({}, desc.value);
                        } else {
                            to[nextKey] = assign([], desc.value);
                        }
                    } else {
                        if (desc !== undefined && desc.enumerable) {
                            to[nextKey] = desc.value;//this will make a shallow copy, altering the override object o[nextKey];
                        }
                    }
                }
            }
        });
    return to as T;
}

export function primitivesEqual(o1: primitiveTypes, o2: primitiveTypes) {
    let normalize = (oo: any) => {
        if (isNullOrUndefined(oo))
            return null;
        else if (isDate(oo))
            return oo.getTime();
        return oo;
    };
    o1 = normalize(o1);
    o2 = normalize(o2);

    return o1 === o2;
}
export function objectsEqual<T extends object>(o1: T, o2: T, ignoreKeys?: string[]) {
    let isPrimitive1 = isPrimitiveValue(o1);
    let isPrimitive2 = isPrimitiveValue(o2);

    if (isPrimitive1 !== isPrimitive2) return false;//one primitive other not?
    if (isPrimitive1)
        return primitivesEqual(o1 as unknown as primitiveTypes, o2 as unknown as primitiveTypes);

    if (isFunction(o1) || isFunction(o2)) {
        try {
            return o1.toString() === o2.toString();
        } catch (e) {
            return false;
        }
    }
    else if (o1 instanceof HTMLElement) {
        return o1 === o2;
    }

    ignoreKeys = ignoreKeys || [];
    let allKeys = makeUniqueArray(Object.keys(o1).concat(Object.keys(o2))).filter(key => !ignoreKeys.includes(key));
    for (let i = 0; i < allKeys.length; i++) {
        let key = allKeys[i];
        if (!objectsEqual(o1[key], o2[key], ignoreKeys))
            return false;
    }
    return true;
}
export function jsonClone<T>(obj: T): T {
    //cloneDatesOnObjectRecursivily is a browser performance killer... avoid if possible

    if (isNullOrUndefined(obj)) return null;
    let result = obj;

    try {
        if (obj instanceof HTMLElement)
            return obj.cloneNode(true) as T;
        //if exists and worked - this handles dates correctly too
        return structuredClone(obj);
    } catch (e) {
        // Fallback for older environments or non-serializable objects
        try { result = jsonParse<T>(JSON.stringify(obj)); }
        catch (e) {
            if (isNotEmptyArray(obj))
                result = (obj as any).slice();
            else
                result = obj;
        }

        //clone date objects
        try { cloneDatesOnObjectRecursivily(obj, result); } catch (e) { }
        return result;
    }
}

function cloneDatesOnObjectRecursivily(obj1, obj2) {
    Object.keys(obj1).forEach(key => {
        let v = obj1[key];
        if (v === null)
            obj2[key] = null;
        else if (isDate(v))
            obj2[key] = new Date(v.getTime());
        else if (isObject(v) && Object.keys(v).length) {
            let v2 = obj2[key];
            if (isObject(v2))
                cloneDatesOnObjectRecursivily(v, v2);
        }
    });
}

/** if an object in this path doesnt exist under parent - creates it.*/
export function ensureObjectPath(objectPath: string, defaultValue: any = {}, parent: any = $w) {
    if (isNullOrEmptyString(objectPath)) return;
    let parts = objectPath.split('.');
    for (let i = 0; i < parts.length; i++) {
        let partName = parts[i];
        if (i === parts.length - 1)//last
        {
            if (isNullOrUndefined(parent[partName]))
                parent[partName] = defaultValue;
        }
        else {
            if (isNullOrUndefined(parent[partName]))
                parent[partName] = {};
            parent = parent[partName];
        }
    }
}

/** If o has propb and not propa - will copy propb into propa and remove propb */
export function keepOne(o: any, propa: string, propb: string) {
    /* using the unkown type doesn't work in modern apps project */
    if (isObject(o)) {
        if (!hasOwnProperty(o, propa) && hasOwnProperty(o, propb)) {
            o[propa] = o[propb];
            delete o[propb];
        }
    }
}

/**return all members and functions of an object, including inherited ones from its base class, excluding the constructor
 * send prototypeLevels to limit the number of prototype climbs to get functions from. 0 means unlimited.
 */
export function getAllMemberNames(instance: any, prototypeLevels: number): string[] {
    let props: string[] = [];
    let obj = instance;
    let level = 0;
    let unlimitedLevels = prototypeLevels < 0;

    do {
        props.push(...Object.getOwnPropertyNames(obj));
        obj = Object.getPrototypeOf(obj);
        level++;
    }
    while (unlimitedLevels ? !!obj : !!obj && level <= prototypeLevels);

    return makeUniqueArray(props.filter(p => p !== 'constructor' && p !== 'dispose'));
}
/**return all functions of an object, including inherited ones from its base class, excluding the constructor
 * send prototypeLevels to limit the number of prototype climbs to get functions from. 0 means unlimited.
 */
export function getAllFunctionNames(instance: any, prototypeLevels: number): string[] {
    return getAllMemberNames(instance, prototypeLevels).filter(p => isFunction(instance[p]));
}

/** generic implementation of Object.values */
export function objectValues<T = any>(obj: any): T[] {
    return Object.keys(obj).map((key) => {
        return obj[key];
    }) as T[];
}

export class DefaultProp<T> {
    private _value: T;
    private _defaultValue: T | (() => T);
    private isValid: (value: T) => boolean;
    public set value(newValue: T) { this._value = newValue; }
    public get value() {
        if (!this.isValid(this._value)) {
            this._value = isFunction(this._defaultValue)
                ? (this._defaultValue as () => T)()
                : this._defaultValue;
        }
        return this._value;
    }
    public constructor(defaultValue: T | (() => T), initialValue?: T, isValid?: (value: T) => boolean) {
        this._defaultValue = defaultValue;
        this._value = initialValue;
        this.isValid = isFunction(isValid) ? isValid : v => !isNullOrUndefined(v);
    }
}
/** creates a safe property, if the value is null/undefined or empty string - it will return the default value. */
export function GetDefaultProp<T>(defaultValue: T | (() => T), initialValue?: T, isValid?: (value: T) => boolean) {
    return new DefaultProp(defaultValue, initialValue, isValid);
}

/** Get string error message from an error object */
export function GetError(error: any, defaultError: string = "Unknown error"): string {
    const err = isNullOrUndefined(error)
        ? defaultError
        : isString(error)
            ? error
            : isString((error as Error).message)
                ? error.message
                : defaultError;
    return err.length > 0 ? err : defaultError;
}