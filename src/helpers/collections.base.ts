
/** this file will only use basic type checker and types, do not add functions that require
 * a reference to tother helpers
 */
import { IDictionary } from "../types/common.types";
import { getFromFullName, isBoolean, isDate, isFunction, isNotEmptyArray, isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber, isString, isTypeofFullNameFunction } from "./typecheckers";

/** this will support HtmlCollectionOf, Arrays, and any other types that have a length and indexer Issue 568 */
export interface IndexedCollection<ElementType> {
    length: number;
    [index: number]: ElementType;
}

/** Finds an object in array based on a filter and moves it to the start of the array  */
export function moveToStart<T>(arr: T[], filter?: (item: T) => boolean) {
    let index = firstIndexOf<T>(arr, filter);

    if (index > 0) {
        let obj = arr[index];
        arr.splice(index, 1);
        arr.unshift(obj);
    }
}

/** Finds an object in array based on a filter and moves it to the end of the array  */
export function moveToEnd<T>(arr: T[], filter?: (item: T) => boolean) {
    let index = firstIndexOf<T>(arr, filter);

    if (index !== -1 && index !== arr.length - 1) {
        let obj = arr[index];
        arr.splice(index, 1);
        arr.push(obj);
    }
}

/** Get the first index of an object of an array, or -1  if the array is empty / null  */
// export function firstIndexOf<T extends Element>(arr: HTMLCollectionOf<T>, filter?: (item: T, index?: number) => boolean, startFrom?: number): number;
// export function firstIndexOf<T>(arr: T[], filter?: (item: T, index?: number) => boolean, startFrom?: number): number;
export function firstIndexOf<T>(arr: IndexedCollection<T>, filter?: (item: T, index?: number) => boolean, startFrom?: number): number {
    if (!isNullOrUndefined(arr) && arr.length > 0) {
        if (isFunction(filter)) {
            //use for loop so we can stop when it is found
            for (let i = startFrom > 0 ? startFrom : 0; i < arr.length; i++)
                if (filter(arr[i], i) === true)
                    return i;
        }
        else return 0;
    }

    return -1;
}
/** Get the first object of an array, or null if the array is empty / null
 * If you pass a filter, it will find the first element that matches the filter and return it, stopping the loop when it is found
 * */
export function firstOrNull<T>(arr: IndexedCollection<T>, filter?: (item: T, index?: number) => boolean): T {
    let index = firstIndexOf(arr, filter);
    return index < 0 ? null : arr[index];
}


/** Get the last index of an object of an array, or -1  if the array is empty / null  */
export function lastIndexOf<T>(arr: IndexedCollection<T>, filter?: (item: T) => boolean): number {
    if (!isNullOrUndefined(arr) && arr.length > 0) {
        if (isFunction(filter)) {
            //use for loop so we can stop when it is found
            for (let i = arr.length - 1; i >= 0; i--)
                if (filter(arr[i]) === true)
                    return i;
        }
        else return arr.length - 1;
    }

    return -1;
}

/** get the last element or null */
export function lastOrNull<T>(arr: IndexedCollection<T>, filter?: (item: T) => boolean): T {
    let index = lastIndexOf(arr as T[], filter);
    return index < 0 ? null : arr[index];
}

/** Get the first index of an object of an array, or -1  if the array is empty / null  */
export async function firstIndexOfAsync<T>(arr: IndexedCollection<T>, filter?: (item: T, index?: number) => Promise<boolean>, startFrom?: number): Promise<number> {
    if (!isNullOrUndefined(arr) && arr.length > 0) {
        if (isFunction(filter)) {
            //use for loop so we can stop when it is found
            for (let i = startFrom > 0 ? startFrom : 0; i < arr.length; i++)
                if ((await filter(arr[i], i)) === true)
                    return i;
        }
        else return 0;
    }

    return -1;
}
/** Get the first object of an array, or null if the array is empty / null
 * If you pass a filter, it will find the first element that matches the filter and return it, stopping the loop when it is found
 * */
export async function firstOrNullAsync<T>(arr: IndexedCollection<T>, filter?: (item: T, index?: number) => Promise<boolean>): Promise<T> {
    let index = await firstIndexOfAsync(arr, filter);
    return index < 0 ? null : arr[index];
}


/** Get the last index of an object of an array, or -1  if the array is empty / null  */
export async function lastIndexOfAsync<T>(arr: IndexedCollection<T>, filter?: (item: T) => Promise<boolean>): Promise<number> {
    if (!isNullOrUndefined(arr) && arr.length > 0) {
        if (isFunction(filter)) {
            //use for loop so we can stop when it is found
            for (let i = arr.length - 1; i >= 0; i--)
                if ((await filter(arr[i])) === true)
                    return i;
        }
        else return arr.length - 1;
    }

    return -1;
}

/** get the last element or null */
export async function lastOrNullAsync<T>(arr: IndexedCollection<T>, filter?: (item: T) => Promise<boolean>): Promise<T> {
    let index = await lastIndexOfAsync(arr, filter);
    return index < 0 ? null : arr[index];
}

/** Sorts an array of complex objects, use defaultPrimitiveGetValue for default functionality */
export function sortArray<T>(arr: T[], getValue: (item: T) => number | string) {
    if (!isNullOrEmptyArray(arr)) {
        if (isTypeofFullNameFunction("Intl.Collator")) {
            //todo: should probably use the SharePoint locale isntead of 'undefined'
            let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
            arr.sort((a, b) => {
                let va = getValue(a);
                let vb = getValue(b);
                return collator.compare(va as string, vb as string);
            });
        } else {
            arr.sort((a, b) => {
                let va = getValue(a);
                if (isString(va)) va = va.toLowerCase();
                let vb = getValue(b);
                if (isString(vb)) vb = vb.toLowerCase();
                return va === vb ? 0 : va > vb ? 1 : -1;
            });
        }
    }
    return arr;
}

/** removes null, undefined or "" elements from the array */
export function filterEmptyEntries<T>(arr: T[]) {
    return arr.filter(val => !isNullOrEmptyString(val));
}


export function sortNumberArrayAsc(a: number, b: number): number {
    return a - b;
}
export function sortNumberArray(a: number, b: number): number {
    return b - a;
}
/** call a foreach on an object or an array, with an option to break when returning false */
export function forEach<T>(obj: IDictionary<T> | Array<T> | { [key: number]: T; length: number; }, func: (propertyName: string, propertyValue: T, _args?: any) => void | boolean, args?: any) {
    if (obj && func && isFunction(func)) {
        if (Array.isArray(obj) || obj.constructor && getFromFullName("constructor.name", obj) === "Array") {
            for (let i = 0; i < (obj as Array<T>).length; i++) {
                let property = i;
                let value = obj[property];
                let result = func(property.toString(10), value, args);
                if (result === false) {
                    break;
                }
            }
        }
        else {
            let keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                let property = keys[i];
                let value = obj[property];
                let result = func(property, value, args);
                if (result === false) {
                    break;
                }
            }
        }
    }
}

export async function forEachAsync<ElmType, ResultType>(arr: Array<ElmType> | IDictionary<ElmType>, handler: (elm: ElmType, index: number) => Promise<ResultType>, options?: { parallel?: boolean; }) {
    if (!isNullOrUndefined(arr) && Object.keys(arr).length > 0) {
        let keys = Object.keys(arr);
        if (options && options.parallel) {
            let promises: Promise<ResultType>[] = [];
            keys.forEach((key, i) => {
                promises.push(handler(arr[key], i));
            });
            return Promise.all(promises);
        }
        else {
            let results: ResultType[] = [];
            for (let i = 0; i < keys.length; i++) {
                results.push(await handler(arr[keys[i]], i));
            }
            return results;
        }
    }
    else return []
}

export function sizeOf(obj: any) {
    if (Array.isArray(obj))
        return obj.length;
    return Object.keys(obj).length;
}

export function chunkArray<T>(array: T[], maxChunkSize: number): T[][] {
    const result: T[][] = [];
    let remaining = array.length;
    let index = 0;

    let chunks = Math.ceil(array.length / maxChunkSize);

    while (chunks > 0) {
        const size = Math.ceil(remaining / chunks);
        result.push(array.slice(index, index + size));

        index += size;
        remaining -= size;
        chunks--;
    }

    return result;
}

/** Takes an array and transforms it into a hash. this will assign 1 item per key, assumig getKey will be unique per item. */
export function toHash<T, Y = T>(arr: T[], getKey: (element: T) => string | number, filter?: (element: T) => boolean, transformValue?: (element: T) => Y): IDictionary<Y> {
    let hash: { [key: string | number]: Y; } = {};
    if (!isFunction(transformValue)) transformValue = v => v as any as Y;
    if (isNotEmptyArray(arr))
        arr.forEach(i => {
            if (!isFunction(filter) || filter(i))
                hash[getKey(i)] = transformValue(i);
        });
    return hash;
}

/** Returns an array from the values of the dictionary. */
export function toArray<Source, Result = Source>(hash: { [key: string]: Source; }, filter?: (element: Source) => boolean, transform?: (key: string, element: Source) => Result): Result[] {
    let arr: Result[] = [];
    if (!isFunction(transform)) transform = (key, element) => element as any as Result;

    if (!isNullOrUndefined(hash))
        Object.keys(hash).forEach(key => {
            if (!isFunction(filter) || filter(hash[key]))
                arr.push(transform(key, hash[key]));
        });
    return arr;
}

/** returns a new dictionary, converting each entry in source using the transform function */
export function convertDictionary<S, R>(source: IDictionary<S>, transform: (sourceItem: S) => R): IDictionary<R> {
    let result: IDictionary<R> = {};
    forEach(source, (key, value) => { result[key] = transform(value); });
    return result;
}

export function flattenArray<T>(array: (T | T[])[]) {
    return array.reduce((acc, val) => (acc as T[]).concat(val), []) as T[];
}

/** careful, does not work for date/complex objects. Use GetUniqueArrayInfo if you suspect you might have Date/complex objects. */
export function makeUniqueArray<T>(arr: T[]) {
    return arr.filter((v, i, a) => a.indexOf(v) === i);
}

/** return an array of unique values, and the first index they were found, use defaultPrimitiveGetValue for default functionality */
export function GetUniqueArrayInfo<T, V>(arr: T[], getValue: (item: T) => V) {
    var uniqueValues: { item: T; value: V; firstIndex: number; }[] = [];
    var uniqueArray: T[] = [];
    var foundValues: V[] = [];
    var hasDuplicates = false;
    var duplicateIndexes: number[] = [];

    if (isNotEmptyArray(arr)) {
        arr.forEach((item, index) => {
            let value = getValue(item);
            if (foundValues.includes(value)) {
                hasDuplicates = true;
                duplicateIndexes.push(index);
            }
            else {
                foundValues.push(value);
                uniqueValues.push({ item: item, value: value, firstIndex: index });
                uniqueArray.push(item);
            }
        });
    }

    return {
        /** true if duplicate values found */
        hasDuplicates: hasDuplicates,
        /** all duplicate item indexes */
        duplicateIndexes: duplicateIndexes,
        /** unique values and their info */
        uniqueValues: uniqueValues,
        /** the unique version of this array */
        uniqueArray: uniqueArray
    };
}

export interface IMultiLevelGroupItem<ItemType> {
    parentGroup: IMultiLevelGroup<ItemType>;
}
export interface IMultiLevelGroup<ItemType> {
    groupItems: (ItemType & IMultiLevelGroupItem<ItemType>)[];
    subGroups: IDictionary<IMultiLevelGroup<ItemType>>;
    depth: number;
    parentGroup: IMultiLevelGroup<ItemType>;
    /** would contain the path to the group, such as: 0_1_3 for first group, second sub group, 4th sub-sub group */
    key: string;
    index: number;
    title: string;
    /** Optional, add a prefix to the group. For example: "Priority > " to fullTitle will be "Priority > High" */
    groupPrefix?: string;
    /** title with decorations, such as prefix */
    fullTitle: string;
}
export type MultiLevelGroupItem<ItemType> = ItemType & IMultiLevelGroupItem<ItemType>;
export type MultiLevelGroupOrItem<ItemType> = MultiLevelGroupItem<ItemType> | IMultiLevelGroup<ItemType>;
/** returns true if the element is a group of items */
export function IsMultiLevelGroup<ItemType>(groupOrItem: MultiLevelGroupOrItem<ItemType>): groupOrItem is IMultiLevelGroup<ItemType> {
    let asGroup = groupOrItem as IMultiLevelGroup<ItemType>;
    return !isNullOrUndefined(asGroup.subGroups) && Array.isArray(asGroup.groupItems) && isNumber(asGroup.index) && isNumber(asGroup.depth);
}

/** returns a flat array of groups>items ordered by groups */
export function FlattenGroupItems<ItemType>(groups: IDictionary<IMultiLevelGroup<ItemType>>) {
    let flatItems: MultiLevelGroupOrItem<ItemType>[] = [];
    Object.keys(groups).forEach(groupName => {
        let group = groups[groupName];
        if (!isNullOrEmptyString(groupName))
            flatItems.push(group);
        let subGroups = Object.keys(group.subGroups);
        if (isNotEmptyArray(subGroups)) {
            flatItems.push(...FlattenGroupItems(group.subGroups));
        }
        else flatItems.push(...group.groupItems);
    });

    return flatItems;
}

/** split a collection by page size and return the info */
export function GetPagedCollectionInfo<T>(collection: Array<T>, pageSize: number, currentPage?: number) {
    let pagedItems: (T[])[] = [];

    if (pageSize < 1) {
        pagedItems = [collection.slice()];
    }
    else {
        let copy = collection.slice();
        while (isNotEmptyArray(copy)) {
            pagedItems.push(copy.splice(0, pageSize));
        }
    }

    currentPage = isNumber(currentPage) && currentPage >= 0 && currentPage < pagedItems.length ? currentPage : 0;
    return {
        /** nubmer of pages */
        pages: pagedItems.length,
        /** page items, per page (Array of pages, each has an array of the page items) */
        pagedItems: pagedItems,
        /** the current page */
        currentPage: currentPage,
        /** the current page items */
        currentPageItems: pagedItems[currentPage] || [],
        /** has more than 1 page */
        hasPages: pagedItems.length > 1,
        allowPrev: currentPage > 0,
        allowNext: currentPage < pagedItems.length - 1
    };
}

/** use with sortArray or get unique array to handle premitive types or dates, with a JSON.stringify to all other values */
export function defaultPrimitiveGetValue<T>(item: T) {
    return isNullOrUndefined(item)
        ? ""
        : isDate(item) ? item.getTime()
            : isBoolean(item)
                ? item === true ? 1 : 0
                : isNumber(item) || isString(item)
                    ? item
                    : JSON.stringify(item);
}

export function RemoveItemFromArr<T>(arr: T[], item: T) {
    let idx = arr.indexOf(item);
    if (idx >= 0)
        arr.splice(idx, 1);
}
export function PushNoDuplicate<T>(arr: T[], item: T) {
    if (!arr.includes(item)) arr.push(item);
}
/** fills an array with a value. Array.fill isn't available on SPFx. */
export function ArrayFill<T>(arr: T[], value: T, onlyEmpty?: boolean) {
    for (let i = 0; i < arr.length; i++) {
        if (onlyEmpty !== true || isNullOrUndefined(arr[i]))
            arr[i] = value;
    }
    return arr;
}

/** give a name and a collection, and it will return a unique name availalbe, suffixing a _# to the name
 * example: file
 * return file, file_2, file_9 etc... whichever is availalbe first.
 */
export function FindNextAvailableName(name: string, usedNames: string[], options?: {
    //check for specific letter case
    caseSensitive?: boolean;
    //append suffix when adding _# for example: file_1.docx, file_2.docx etc
    suffix?: string;
}) {
    let nameForTest = name;
    if (options && options.caseSensitive !== true) {
        usedNames = usedNames.map(n => n.toLowerCase());
        nameForTest = name.toLowerCase();
    }

    let nameSuffix = options && options.suffix || "";

    let suffixIdx = 0;
    let suffixStr = "";
    while (usedNames.indexOf(`${nameForTest}${suffixStr}${nameSuffix}`) >= 0) {
        suffixIdx++;
        suffixStr = "_" + suffixIdx;
    }

    return `${name}${suffixStr}${nameSuffix}`;
}

//** returns an array of numbers from 0,1,2... */
export function numbersArray<T extends number>(length: number, startFrom: number = 0) {
    //dvp build will fail without any type
    if (isNullOrUndefined(length) || length < 0) length = 0;
    let arr: number[] = Array.from((Array(length) as any).keys());
    return startFrom > 0
        ? arr.map(i => i + startFrom) as T[]
        : arr as T[];
}