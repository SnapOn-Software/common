import assert from 'assert/strict';
import test from 'node:test';
import { eval2 } from "./eval"; 

test('eval2', async t => {
    await t.test('null', () => assert.deepEqual(eval2('null'), null));
    sadds = undefined;
    await t.test('sadds', () => assert.deepEqual(eval2('sadds'), undefined));
    adfs = 'sassds';
    await t.test('sassds', () => assert.deepEqual(eval2('adfs'), adfs));
    await t.test('new String(9 - 7)', () => assert.deepEqual(eval2(new String(9 - 7)), new String('2')));
});