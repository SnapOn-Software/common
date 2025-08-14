import assert from 'assert/strict';
import test from 'node:test';
import { jsonParse, jsonStringify } from "./json";



test('jsonParse', async t => {
    await t.test('emptyString returns null', () => assert.deepEqual(jsonParse(''), null));
    await t.test('blank return null', () => assert.deepEqual(jsonParse(), null));
    await t.test('string into object with strings and int', () => assert.deepEqual(jsonParse('{"a" : 1, "b" : "b"}'), {'a' : 1, 'b' : 'b'}));
});

test('jsonStringify', async t => {
    await t.test('null returns empty', () => assert.deepEqual(jsonStringify(null), ''));
    json = {1:2, 3:4};
    await t.test('object into string', () => assert.deepEqual(jsonStringify(json), '{"1":2,"3":4}'));
    json = {1:-7.2, 3:0};
    await t.test('object into string with floats and 0', () => assert.deepEqual(jsonStringify(json), '{"1":-7.2,"3":0}'));
});