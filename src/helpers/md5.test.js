import assert from 'assert/strict';
import test from 'node:test';

//while testing imports hex, rhex, cmn
process.env.NODE_ENV = 'test';
const { hex, rhex, cmn  } = require('./md5');

test('rhex', async t => {
    await t.test('0', () => assert.deepEqual(rhex(0), '00000000'));
    await t.test('null', () => assert.deepEqual(rhex(null), '00000000'));
    await t.test('emptyString', () => assert.deepEqual(rhex(''), '00000000'));
    await t.test('[12345678]', () => assert.deepEqual(rhex([12345678]), '4e61bc00'));
});

test('hex', async t => {
    await t.test('[1, 2, 3]', () => assert.deepEqual(hex([1, 2, 3]), '010000000200000003000000'));
    await t.test('[]', () => assert.deepEqual(hex([]), ''));
    await t.test('[-1, [2, 3]]', () => assert.deepEqual(hex([-1, [2, 3]]), 'ffffffff00000000'));
    await t.test('[null]', () => assert.deepEqual(hex([null]), '00000000'));
});

test('cmn', async t => {
    await t.test('4, 2', () => assert.deepEqual(cmn(4, 2), 0));
    await t.test('-1, 0, 1, 2, 3', () => assert.deepEqual(cmn(-1, 0, 1, 2, 3), 0));
    await t.test('-1, 1, 1, 2, 3', () => assert.deepEqual(cmn(-1, 1, 1, 2, 3), 1));
    await t.test('null', () => assert.deepEqual(cmn(null), 0));
});