import assert from 'assert/strict';
import test from 'node:test';
import { forEachAsync, makeUniqueArray, numbersArray } from "./collections.base";

test('forEachAsync', async t => {
    let results = await forEachAsync([1, 2, 3], num => Promise.resolve(num * 2));
    await t.test('[1, 2, 3]', () => assert.deepEqual(results, [2, 4, 6]));
    results = await forEachAsync([1, 2, 3], num => Promise.resolve(num * 2), { parallel: true });
    await t.test('[1, 2, 3] parallel', () => assert.deepEqual(results, [2, 4, 6]));
    results = await forEachAsync(null, num => Promise.resolve(num * 2), { parallel: true });
    await t.test('nulll parallel', () => assert.deepEqual(results, []));
    results = await forEachAsync("test", str => Promise.resolve(`Char: ${str}`), { parallel: true });
    await t.test('Char: ${str} parallel: true', () => assert.deepEqual(results, ["Char: t", "Char: e", "Char: s", "Char: t"]));
});

test('makeUniqueArray', async t => {
    await t.test('length skipping repeats', () => assert.strictEqual(makeUniqueArray([1, 2, 5, 5, 2]).length, 3));
    await t.test(' array length', () => assert.strictEqual(makeUniqueArray([]).length, 0));
    await t.test('single element array', () => assert.strictEqual(makeUniqueArray([1]).length, 1));
});

test('numbersArray', async t => {
    await t.test('empty', () => assert.deepEqual(numbersArray(), []));
    await t.test('length with no starting', () => assert.deepEqual(numbersArray(2), [0, 1]));
    await t.test('position and length', () => assert.deepEqual(numbersArray(2, 2), [2, 3]));
});