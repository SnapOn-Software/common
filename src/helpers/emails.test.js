import assert from 'assert/strict';
import test from 'node:test';
import { isValidEmail } from "./emails"; 

test('isValidEmail', async t => {
    await t.test('empty string', () => assert.deepEqual(isValidEmail(''), false));
    await t.test('null', () => assert.deepEqual(isValidEmail(null), false));
    await t.test('undefined', () => assert.deepEqual(isValidEmail(undefined), false));
    await t.test('aab', () => assert.deepEqual(isValidEmail('aab'), false));
    await t.test('a/^&*ab', () => assert.deepEqual(isValidEmail('a/^&*ab'), false));
    await t.test('a7@a$/b.com$', () => assert.deepEqual(isValidEmail('a7@a$/b.com$'), true));
});
