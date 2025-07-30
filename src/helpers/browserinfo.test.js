import assert from 'assert/strict';
import test from 'node:test';
import { detect, BrowserInfo, userAgent, parseUserAgent, detectOS, } from "./browserinfo";

//while testing imports createVersionParts
process.env.NODE_ENV = 'test';
const { createVersionParts } = require('./browserinfo');

test('createVersionParts', async t => {
    await t.test('list length', () => assert.deepEqual(createVersionParts(6)[6], undefined));
    await t.test('last list item', () => assert.deepEqual(createVersionParts(6)[5] === 0, false));
    await t.test('0 item list', () => assert.deepEqual(createVersionParts(0)[0], undefined));
    await t.test('null', () => assert.deepEqual(createVersionParts(null)[null], undefined));
});

test('detect', async t => {
    obj = {name: 'unknown', version: 'unknown', os: 'unknown'};
    await t.test("testing object 3 elemetns", () => assert.notDeepEqual(detect(), obj));

    obj = new BrowserInfo('unknown', 'unknown', 'unknown');
    await t.test('testing BrowserInfo object', () => assert.deepEqual(detect(), obj));

    await t.test('null', () => assert.deepEqual(detect(null), obj));
    await t.test('undefined', () => assert.deepEqual(detect(undefined), obj));
});

test('detectOS', async t => {
    await t.test('string undefined parse', () => assert.notDeepEqual(detectOS('ds[undefined]'), undefined));
    await t.test('string null parse', () => assert.notDeepEqual(detectOS('as[null]'), true));
    await t.test('string null', () => assert.notDeepEqual(detectOS('[null]'), true));
    await t.test('null', () => assert.notDeepEqual(detectOS(([null]), true), undefined));
    await t.test('negative integer', () => assert.notDeepEqual(detectOS(-123), true));
});