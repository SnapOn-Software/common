import assert from 'assert/strict';
import test from 'node:test';
import { DisableAnchorInterceptInHtml, HTMLDecode, triggerNativeEvent } from "./browser";

test('DisableAnchorInterceptInHtml', async t => {
    await t.test('single link', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<a href="blah">test</a>`), `<a data-interception="off" href="blah">test</a>`));
    await t.test('two links', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<div><a href="blah">test</a><a href="blah">test</a></div>`), `<div><a data-interception="off" href="blah">test</a><a data-interception="off" href="blah">test</a></div>`));
    await t.test('ignore non-link tags', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<p href="blah">test</p>`), `<p href="blah">test</p>`));
});

test('HTMLDecode', async t => {
    await t.test('testing &lt; &#58;', () => assert.strictEqual(HTMLDecode(`hello &lt; &#58;`), `hello < :`));
});

test('triggerNativeEvent', async t => {
    await t.test('null', () => assert.strictEqual(triggerNativeEvent(null), undefined));
    await t.test('undefined', () => assert.strictEqual(triggerNativeEvent(undefined), undefined));
});