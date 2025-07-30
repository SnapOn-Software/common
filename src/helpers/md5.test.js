import assert from 'assert/strict';
import test from 'node:test';

//while testing imports hex, rhex, cmn
process.env.NODE_ENV = 'test';
const { hex, rhex, cmn  } = require('./md5');

test('rhex', async t => {
    await t.test('0', () => assert.deepEqual(rhex(0), '00000000'));
    await t.test('null acts as 0', () => assert.deepEqual(rhex(null), '00000000'));
    await t.test('emptyString acts as 0', () => assert.deepEqual(rhex(''), '00000000'));
    await t.test('works with int in list', () => assert.deepEqual(rhex([12345678]), '4e61bc00'));
});

test('hex', async t => {
    await t.test('works with all list objects', () => assert.deepEqual(hex([1, 2, 3]), '010000000200000003000000'));
    await t.test('empty array returns empty', () => assert.deepEqual(hex([]), ''));
    await t.test('doesnt work with nested int', () => assert.deepEqual(hex([-1, [2, 3]]), 'ffffffff00000000'));
    await t.test('null', () => assert.deepEqual(hex([null]), '00000000'));
});

test('cmn', async t => {
    await t.test('fallsback to 0', () => assert.deepEqual(cmn(4, 2), 0));
    await t.test('0 sets to 0', () => assert.deepEqual(cmn(-1, 0, 1, 2, 3), 0));
    await t.test('tests for negatives', () => assert.deepEqual(cmn(-1, 1, 3, 5, 7), 3));
    await t.test('null', () => assert.deepEqual(cmn(null), 0));
});