/* eslint-disable */

/*! (c) 2020 Andrea Giammarchi */

import { IFlatted } from "../types/flatted.types";
import { isNullOrEmptyArray } from "./typecheckers";

/** Version 3.2.9 */
/**
 * Fast and minimal circular JSON parser.
 * logic example
```js
var a = [{one: 1}, {two: '2'}];
a[0].a = a;
// a is the main object, will be at index '0'
// {one: 1} is the second object, index '1'
// {two: '2'} the third, in '2', and it has a string
// which will be found at index '3'
Flatted.stringify(a);
// [["1","2"],{"one":1,"a":"0"},{"two":"3"},"2"]
// a[one,two]    {one: 1, a}    {two: '2'}  '2'
```
 */
const { parse: $parse, stringify: $stringify } = JSON;
const { keys } = Object;

const Primitive = String;   // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore = {};
const object = 'object';

const noop = (_, value) => value;

const primitives = value => (
    value instanceof Primitive ? Primitive(value) : value
);

const Primitives = (_, value) => (
    typeof value === primitive ? new Primitive(value) : value
);

const revive = (input, parsed, output, $) => {
    const lazy = [];
    for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
        const k = ke[y];
        const value = output[k];
        if (value instanceof Primitive) {
            const tmp = input[value as string];
            if (typeof tmp === object && !parsed.has(tmp)) {
                parsed.add(tmp);
                output[k] = ignore;
                lazy.push({ k, a: [input, parsed, tmp, $] });
            }
            else
                output[k] = $.call(output, k, tmp);
        }
        else if (output[k] !== ignore)
            output[k] = $.call(output, k, value);
    }
    for (let { length } = lazy, i = 0; i < length; i++) {
        const { k, a } = lazy[i];
        output[k] = $.call(output, k, revive.apply(null, a));
    }
    return output;
};

const set = (known, input, value) => {
    const index = Primitive(input.push(value) - 1);
    known.set(value, index);
    return index;
};

export const parse = (text, reviver?) => {
    const input = $parse(text, Primitives).map(primitives);
    const value = input[0];
    const $ = reviver || noop;
    const tmp = typeof value === object && value ?
        revive(input, new Set, value, $) :
        value;
    return $.call({ '': tmp }, '', tmp);
};
//exports.parse = parse;

export const stringify = (value, replacer?, space?) => { 
    const $ = replacer && typeof replacer === object ?
        (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0) :
        (replacer || noop);
    const known = new Map;
    const input = [];
    const output = [];
    let i = +set(known, input, $.call({ '': value }, '', value));
    let firstRun = !i;
    while (i < input.length) {
        firstRun = true;
        output[i] = $stringify(input[i++], replace, space);
    }
    return '[' + output.join(',') + ']';
    function replace(key, value) {
        if (firstRun) {
            firstRun = !firstRun;
            return value;
        }
        const after = $.call(this, key, value);
        switch (typeof after) {
            case object:
                if (after === null) return after;
                return known.get(after) || set(known, input, after);
            case primitive:
                return known.get(after) || set(known, input, after);
        }
        return after;
    }
};
//exports.stringify = stringify;

export const toJSON = any => $parse(stringify(any));
//exports.toJSON = toJSON;
export const fromJSON = any => parse($stringify(any));
//exports.fromJSON = fromJSON;


/*! (c) 2020 Andrea Giammarchi */
/**
 * Fast and minimal circular JSON parser.
 * logic example
```js
var a = [{one: 1}, {two: '2'}];
a[0].a = a;
// a is the main object, will be at index '0'
// {one: 1} is the second object, index '1'
// {two: '2'} the third, in '2', and it has a string
// which will be found at index '3'
Flatted.stringify(a);
// [["1","2"],{"one":1,"a":"0"},{"two":"3"},"2"]
// a[one,two]    {one: 1, a}    {two: '2'}  '2'
```
 */
export var flatted: IFlatted = {
    toJSON: toJSON,
    fromJSON: fromJSON,
    stringify: stringify,
    parse: parse
};

export function flattedClone<T>(obj: T): T {
    if (isNullOrEmptyArray(obj)) return obj;
    //json clone won't work on circular object. must use flatted.
    return flatted.parse(flatted.stringify(obj));
}