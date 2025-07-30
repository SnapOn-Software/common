import assert from 'assert/strict';
import test from 'node:test';
import { flattedClone } from "./flatted"; 

test('flattedClone', async t => {
    await t.test('empty list', () => assert.deepEqual(flattedClone([]), []));
    await t.test('null ', () => assert.deepEqual(flattedClone(null), null));
    await t.test('cloning undefined returns null', () => assert.deepEqual(flattedClone([undefined]), [null]));
    await t.test('cloning nested undefined returns null and rest of the list', () => assert.deepEqual(flattedClone([[undefined, null]]), [[null, null]]));
    await t.test('cloning nested ints in list', () => assert.deepEqual(flattedClone([-123, [[0]]]), [-123, [[0]]]));
});