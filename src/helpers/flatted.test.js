import assert from 'assert/strict';
import test from 'node:test';
import { flattedClone } from "./flatted"; 

test('flattedClone', async t => {
    await t.test("'[null]'", () => assert.deepEqual(flattedClone('[null]'), '[null]'));
    await t.test('[]', () => assert.deepEqual(flattedClone([]), []));
    await t.test('null', () => assert.deepEqual(flattedClone(null), null));
    await t.test('[undefined]', () => assert.deepEqual(flattedClone([undefined]), [null]));
    await t.test('[[undefined, null]]', () => assert.deepEqual(flattedClone([[undefined, null]]), [[null, null]]));
    await t.test('[-123, [[0]]]', () => assert.deepEqual(flattedClone([-123, [[0]]]), [-123, [[0]]]));
});