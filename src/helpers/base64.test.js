import assert from 'assert/strict';
import test from 'node:test';
import { fromArrayBuffer, fromUint8Array, toArrayBuffer, toUint8Array } from "./base64";

const asBase64 = "YXNkIUAjQFJSRkclJCMoRWdTKlIoUkUoRlZJQURPQVcpOSApKEFTRCAoU0QqR0ZBIEAjJV4=";
test('ArrayBuffer Base64 Tests', async t => {
    const toAB = toArrayBuffer(asBase64);
    await t.test('is ArrayBuffer', () => assert.strictEqual(toAB instanceof ArrayBuffer, true));
    await t.test('restored', () => assert.strictEqual(fromArrayBuffer(toAB), asBase64));
});

test('uint8array Base64 Tests', async t => {
    const touint = toUint8Array(asBase64);
    await t.test('is Uint8Array', () => assert.strictEqual(touint instanceof Uint8Array, true));
    await t.test('restored', () => assert.strictEqual(fromUint8Array(touint), asBase64));
});