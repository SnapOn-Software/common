import assert from 'assert/strict';
import test from 'node:test';
import { setCookie } from './cookies.ts';

test('cookies.node', async t => {
    await t.test('setCookie no-ops outside the browser', () => {
        assert.doesNotThrow(() => setCookie('testCookie', 'abc', 1, '/'));
    });
});
