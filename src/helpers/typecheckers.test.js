import assert from 'assert/strict';
import test from 'node:test';
import { isEmptyObject, isNullOrEmptyString, isPrimitiveValue, isNotEmptyArray, isNullOrNaN, isBoolean, isUndefined, isNullOrUndefined, isObject, isType, isString, isNotEmptyString, isNullOrEmptyArray, isNumeric, isNumber, isNumberArray, isFunction } from './typecheckers';

test('isNullOrEmptyString', async t => {
    // This test passes because it does not throw an exception.
    await t.test("null", t => assert.strictEqual(isNullOrEmptyString(null), true));
    await t.test("undefined", t => assert.strictEqual(isNullOrEmptyString(undefined), true));
    await t.test("empty string", t => assert.strictEqual(isNullOrEmptyString(""), true));
    await t.test("space", t => assert.strictEqual(isNullOrEmptyString(" "), false));
    await t.test("0", t => assert.strictEqual(isNullOrEmptyString(0), false));
    await t.test("1", t => assert.strictEqual(isNullOrEmptyString(1), false));
});

test('isEmptyObject', async t => {
    await t.test("null", t => assert.strictEqual(isEmptyObject(null), true));
    await t.test("undefined", t => assert.strictEqual(isEmptyObject(undefined), true));
    await t.test("[]", t => assert.strictEqual(isEmptyObject([]), true));
    await t.test("{}", t => assert.strictEqual(isEmptyObject({}), true));
    await t.test("ignore keys", t => assert.strictEqual(isEmptyObject({ test: 1 }, { ignoreKeys: ["test"] }), true));
    await t.test("[1]", t => assert.strictEqual(isEmptyObject([1]), false));
    await t.test("non empty object", t => assert.strictEqual(isEmptyObject({ test: 1 }), false));
    await t.test("non empty object with ignored key", t => assert.strictEqual(isEmptyObject({ test: 1, test2: 2 }, { ignoreKeys: ["test"] }), false));
});

test('isPrimitiveValue', async t => {
    assert.strictEqual(isPrimitiveValue(1.42), true);
    assert.strictEqual(isPrimitiveValue(new Date()), true);
    assert.strictEqual(isPrimitiveValue({ title: "hello" }), false);
    assert.strictEqual(isPrimitiveValue("hello"), true);
    assert.strictEqual(isPrimitiveValue(() => { }), false);
    assert.strictEqual(isPrimitiveValue([1, 2, 3]), false);
    assert.strictEqual(isPrimitiveValue([]), false);
    assert.strictEqual(isPrimitiveValue(), true);
});

test('isNotEmptyArray', async t => {
    await t.test("null", t => assert.strictEqual(isNotEmptyArray([null]), true));
    await t.test("[1, 2]", t => assert.strictEqual(isNotEmptyArray([1, 2]), true));
    await t.test("[]", t => assert.strictEqual(isNotEmptyArray([]), false));
    await t.test("{}", t => assert.strictEqual(isNotEmptyArray({}), false));
    await t.test("blank", t => assert.strictEqual(isNotEmptyArray(), false));
});

test('isNullOrNaN', async t => {
    await t.test('null', t => assert.strictEqual(isNullOrNaN(null), true));
    await t.test('[null]', t => assert.strictEqual(isNullOrNaN([null]), false));
    await t.test('{null: null}', t => assert.strictEqual(isNullOrNaN({null: null}), true));
    await t.test("'1'", t => assert.strictEqual(isNullOrNaN('1'), false));
    await t.test('1', t => assert.strictEqual(isNullOrNaN(1), false));
    await t.test('string', t => assert.strictEqual(isNullOrNaN('eagsd'), true));
});

test('isBoolean', async t => {
    await t.test('true', t => assert.strictEqual(isBoolean(true), true));
    await t.test('blank', t => assert.strictEqual(isBoolean(), false));
    await t.test('null', t => assert.strictEqual(isBoolean(null), false));
    await t.test('1', t => assert.strictEqual(isBoolean(1), false));
    await t.test("'true'", t => assert.strictEqual(isBoolean('true'), false));
});

test('isUndefined', async t => {
    await t.test('undefined', t => assert.strictEqual(isUndefined(undefined), true));
    await t.test('blank', t => assert.strictEqual(isUndefined(), true));
    await t.test('null', t => assert.strictEqual(isUndefined(null), false));
    await t.test('1', t => assert.strictEqual(isUndefined(1), false));
    await t.test("'undefined'", t => assert.strictEqual(isUndefined('undefined'), false));
});

test('isNullOrUndefined', async t => {
    await t.test('undefined', t => assert.strictEqual(isNullOrUndefined(undefined), true));
    await t.test('blank', t => assert.strictEqual(isNullOrUndefined(), true));
    await t.test('null', t => assert.strictEqual(isNullOrUndefined(null), true));
    await t.test('1', t => assert.strictEqual(isNullOrUndefined(1), false));
    await t.test("'undefined'", t => assert.strictEqual(isNullOrUndefined('undefined'), false));
});

test('isObject', async t => {
    obj = {'a':'b'};
    await t.test("{'a':'b'}", t => assert.strictEqual(isObject(obj), true));
    await t.test('null', t => assert.strictEqual(isObject(null), true));
    await t.test('blank', t => assert.strictEqual(isObject(), false));
    await t.test('emptyString', t => assert.strictEqual(isObject(''), false));
    await t.test('-45367891231312312', t => assert.strictEqual(isObject(-45367891231312312), false));
    await t.test('["a", 2]', t => assert.strictEqual(isObject(['a', 2]), true));
});

test('isType', async t => {
    await t.test("'dfg'", t => assert.strictEqual(isType('dfg', 'string'), true));
    await t.test('emptyString', t => assert.strictEqual(isType('', 'string'), true));
    await t.test("'1'", t => assert.strictEqual(isType('1', 'string'), true));
    await t.test("'1'", t => assert.strictEqual(isType('1', 'integer'), false));
    await t.test('1', t => assert.strictEqual(isType(1, 'integer'), false));
});

test('isString', async t => {
    await t.test('emptyString', t => assert.strictEqual(isString(''), true));
    await t.test('blank', t => assert.strictEqual(isString(), false));
    await t.test('null', t => assert.strictEqual(isString(null), false));
    await t.test("'null'", t => assert.strictEqual(isString('null'), true));
    await t.test('1', t => assert.strictEqual(isString(1), false));
    await t.test("'1'", t => assert.strictEqual(isString('1'), true));
});

test('isNotEmptyString', async t => {
    await t.test('emptyString', t => assert.strictEqual(isNotEmptyString(''), false));
    await t.test('null', t => assert.strictEqual(isNotEmptyString(null), false));
    await t.test("'null'", t => assert.strictEqual(isNotEmptyString('null'), true));
    await t.test("'12'", t => assert.strictEqual(isNotEmptyString('12'), true));
    await t.test('12', t => assert.strictEqual(isNotEmptyString(12), false));
    await t.test('false', t => assert.strictEqual(isNotEmptyString(false), false));
});

test('isNullOrEmptyArray', async t => {
    await t.test('emptyString', t => assert.strictEqual(isNullOrEmptyArray(''), false));
    await t.test('null', t => assert.strictEqual(isNullOrEmptyArray(null), true));
    await t.test('[]', t => assert.strictEqual(isNullOrEmptyArray([]), true));
    await t.test("'[]'", t => assert.strictEqual(isNullOrEmptyArray('[]'), false));
    await t.test('null', t => assert.strictEqual(isNullOrEmptyArray('null'), false));
    await t.test('[null]', t => assert.strictEqual(isNullOrEmptyArray([null]), false));
});

test('isNumeric', async t => {
    await t.test('emptyString', t => assert.strictEqual(isNumeric(''), false));
    await t.test('null', t => assert.strictEqual(isNumeric(null), false));
    await t.test("['1']", t => assert.strictEqual(isNumeric(['1']), false));
    await t.test('1', t => assert.strictEqual(isNumeric(1), true));
    await t.test('0', t => assert.strictEqual(isNumeric(0), true));
    await t.test("'-1000'", t => assert.strictEqual(isNumeric('-1000'), true));
});
 
test('isNumber', async t => {
    await t.test('emptyString', t => assert.strictEqual(isNumber(''), false));
    await t.test('[1]', t => assert.strictEqual(isNumber([1]), false));
    await t.test('null', t => assert.strictEqual(isNumber(null), false));
    await t.test('0', t => assert.strictEqual(isNumber(0), true));
    await t.test("'1'", t => assert.strictEqual(isNumber('1'), false));
});

test('isNumberArray', async t => {
    await t.test('[1]', t => assert.strictEqual(isNumberArray([1]), true));
    await t.test('[0, -1]', t => assert.strictEqual(isNumberArray([0, -1]), true));
    await t.test('1', t => assert.strictEqual(isNumberArray(1), false));
    await t.test("'[1]'", t => assert.strictEqual(isNumberArray('[1]'), false));
    await t.test('[null]', t => assert.strictEqual(isNumberArray([null]), false));
    await t.test("'1'", t => assert.strictEqual(isNumberArray('1'), false));
});

test('isFunction', async t => {
    await t.test('isFunction', t => assert.strictEqual(isFunction(isFunction), true));
    await t.test("'isFunction'", t => assert.strictEqual(isFunction('isFunction'), false));
    await t.test('[isFunction]', t => assert.strictEqual(isFunction([isFunction]), false));
    await t.test("'[isFunction]'", t => assert.strictEqual(isFunction('[isFunction]'), false));
    await t.test('null', t => assert.strictEqual(isFunction('null'), false));
});