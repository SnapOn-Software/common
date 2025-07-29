import assert from 'assert/strict';
import test from 'node:test';
import { DisableAnchorInterceptInHtml, HTMLDecode, triggerNativeEvent } from "./browser";

test('DisableAnchorInterceptInHtml', async t => {
    await t.test('<a href="blah">test</a>', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<a href="blah">test</a>`), `<a data-interception="off" href="blah">test</a>`));
    await t.test('<div><a href="blah">test</a><a href="blah">test</a></div>', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<div><a href="blah">test</a><a href="blah">test</a></div>`), `<div><a data-interception="off" href="blah">test</a><a data-interception="off" href="blah">test</a></div>`));
    await t.test('<p href="blah">test</p>', () => assert.strictEqual(DisableAnchorInterceptInHtml(`<p href="blah">test</p>`), `<p href="blah">test</p>`));
});

test('HTMLDecode', async t => {
    await t.test('hello &lt; &#58;', () => assert.strictEqual(HTMLDecode(`hello &lt; &#58;`), `hello < :`));
});

test('triggerNativeEvent', async t => {
    await t.test('null', () => assert.strictEqual(triggerNativeEvent(null), undefined));
    await t.test('undefined', () => assert.strictEqual(triggerNativeEvent(undefined), undefined));
});