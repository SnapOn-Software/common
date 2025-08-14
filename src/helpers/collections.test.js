import assert from 'assert/strict';
import test from 'node:test';
import { arraysEqual } from "./collections";



test('arraysEqual', async t => {
    arr1 = ['a', 'b', 'c'];
    arr2 = ['c', 'b', 'a'];
    await t.test('reversedStrings', () => assert.deepEqual(arraysEqual(arr1, arr2), false));
    arr1 = [1, 2, 3];
    arr2 = [1, 2, 3];
    await t.test('sameIntegers', () => assert.deepEqual(arraysEqual(arr1, arr2), true));
    arr1 = [];
    arr2 = [];
    await t.test('empty', () => assert.deepEqual(arraysEqual(arr1, arr2), true));
});
