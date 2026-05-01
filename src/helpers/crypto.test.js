import assert from 'assert/strict';
import test from 'node:test';
import { sign, unsign } from "./crypto";
import { newGuid } from './typecheckers';

test('sign', async t => {
    const password = "1@EWEDF$E%GRE%G" + newGuid();
    const signed = await sign(password, { "name": "test user 1" });
    const restored = await unsign(password, signed);
    await t.test('sign', () => assert.strictEqual(restored.name, "test user 1"));
});
