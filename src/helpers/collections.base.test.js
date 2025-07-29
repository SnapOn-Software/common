import assert from 'assert/strict';
import test from 'node:test';
import { forEachAsync, makeUniqueArray, numbersArray } from "./collections.base";

test('forEachAsync', async t => {
    let results = await forEachAsync([1, 2, 3], num => Promise.resolve(num * 2));
    await t.test('[1, 2, 3]', () => assert.deepEqual(results, [2, 4, 6]));
    results = await forEachAsync([1, 2, 3], num => Promise.resolve(num * 2), { parallel: true });
    await t.test('[1, 2, 3] parallel: true', () => assert.deepEqual(results, [2, 4, 6]));
    results = await forEachAsync(null, num => Promise.resolve(num * 2), { parallel: true });
    await t.test('parallel: true', () => assert.deepEqual(results, []));
    results = await forEachAsync("test", str => Promise.resolve(`Char: ${str}`), { parallel: true });
    await t.test('Char: ${str} parallel: true', () => assert.deepEqual(results, ["Char: t", "Char: e", "Char: s", "Char: t"]));
});

test('makeUniqueArray', async t => {
    await t.test('[1, 2, 5, 5, 2].length', () => assert.strictEqual(makeUniqueArray([1, 2, 5, 5, 2]).length, 3));
    await t.test('[].length', () => assert.strictEqual(makeUniqueArray([]).length, 0));
    await t.test('[1].length', () => assert.strictEqual(makeUniqueArray([1]).length, 1));
});

test('numbersArray', async t => {
    await t.test('empty', () => assert.deepEqual(numbersArray(), []));
    await t.test('2', () => assert.deepEqual(numbersArray(2), [0, 1]));
    await t.test('2, 2', () => assert.deepEqual(numbersArray(2, 2), [2, 3]));
});