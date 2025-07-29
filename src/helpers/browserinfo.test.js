import assert from 'assert/strict';
import test from 'node:test';
import { detect, BrowserInfo, userAgent, parseUserAgent, detectOS, } from "./browserinfo";

//while testing imports createVersionParts
process.env.NODE_ENV = 'test';
const { createVersionParts } = require('./browserinfo');

test('createVersionParts', async t => {
    await t.test('(6)[5]', () => assert.deepEqual(createVersionParts(6)[5], '0'));
    await t.test('(6)[6]', () => assert.deepEqual(createVersionParts(6)[6], undefined));
    await t.test('(6)[0]', () => assert.deepEqual(createVersionParts(6)[0], '0'));
    await t.test('(6)[5]', () => assert.deepEqual(createVersionParts(6)[5] === 0, false));
    await t.test('(0)[0]', () => assert.deepEqual(createVersionParts(0)[0], undefined));
    await t.test('(null)[null]', () => assert.deepEqual(createVersionParts(null)[null], undefined));
    await t.test('(undefined)[undefined]', () => assert.deepEqual(createVersionParts(undefined)[undefined], undefined));
});

test('detect', async t => {
    obj = {name: 'unknown', version: 'unknown', os: 'unknown'};
    await t.test("!detect() == obj{x: 'y'}", () => assert.notDeepEqual(detect(), obj));

    obj = new BrowserInfo('unknown', 'unknown', 'unknown');
    await t.test('detect() == new BrowserInfo{obj}', () => assert.deepEqual(detect(), obj));

    await t.test('null', () => assert.deepEqual(detect(null), obj));
    await t.test('undefined', () => assert.deepEqual(detect(undefined), obj));
});

test('detectOS', async t => {
    await t.test('undefined', () => assert.notDeepEqual(detectOS('ds[undefined]'), undefined));
    await t.test('null', () => assert.notDeepEqual(detectOS('as[null]'), true));
    await t.test('null', () => assert.notDeepEqual(detectOS('[null]'), true));
    await t.test('null', () => assert.notDeepEqual(detectOS(([null]), true), undefined));
    await t.test('-123', () => assert.notDeepEqual(detectOS(-123), true));
});