import assert from 'assert/strict';
import test from 'node:test';
import { eval2 } from "./eval"; 

test('eval2', async t => {
    await t.test('null', () => assert.deepEqual(eval2('null'), null));
    sadds = undefined;
    await t.test('string conversion to undefined', () => assert.deepEqual(eval2('sadds'), undefined));
    adfs = 'sassds';
    await t.test('string=variable in eval', () => assert.deepEqual(eval2('adfs'), adfs));
    await t.test('string object operation', () => assert.deepEqual(eval2(new String(9 - 7)), new String('2')));
});