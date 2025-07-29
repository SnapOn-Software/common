import assert from 'assert/strict';
import test from 'node:test';
import { jsonParse, jsonStringify } from "./json";



test('jsonParse', async t => {
    await t.test('emptyString', () => assert.deepEqual(jsonParse(''), null));
    await t.test('blank', () => assert.deepEqual(jsonParse(), null));
    await t.test('blank', () => assert.deepEqual(jsonParse('{"a" : 1, "b" : "b"}'), {'a' : 1, 'b' : 'b'}));
});

test('jsonStringify', async t => {
    await t.test('null', () => assert.deepEqual(jsonStringify(null), ''));
    json = {1:2, 3:4};
    await t.test('{1:2, 3:4}', () => assert.deepEqual(jsonStringify(json), '{"1":2,"3":4}'));
    json = {1:-7.2, 3:0};
    await t.test('{1:-7.2, 3:0}', () => assert.deepEqual(jsonStringify(json), '{"1":-7.2,"3":0}'));
});