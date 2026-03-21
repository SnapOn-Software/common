import assert from 'assert/strict';
import test from 'node:test';
import { ReplaceTokensInDictionary, capitalizeFirstLetter, codeNameToTitle, escapeXml, maskString, replaceAll, replaceRegex, splitString } from './strings';

test('replaceAll', t => {
    assert.strictEqual(replaceAll("hello old#@! world old#@! !", "old#@!", "new!@$"), "hello new!@$ world new!@$ !");

    //this failed since the input find included protected regex characters.
    //escapeRegExp needs to fix that
    let string = "string with special regex[:(s:) chars";
    let find = "regex[:(s:)";
    let replace = "regex[~~(s~~)";
    let result = "string with special regex[~~(s~~) chars";
    assert.strictEqual(replaceAll(string, find, replace), result);

    string = `To activate the KWIZ Forms feature in your list you should click the "KWIZ Forms Display Mode" button:

![](https://kwizcom.sharepoint.com/sites/Docs/CMSResources/CMS365/Screenshot 2024-06-18 123120.jpg)

Now select one "Side Panel" or "Full Page" for the display mode:`;
    find = "https://kwizcom.sharepoint.com/sites/Docs/CMSResources/CMS365/Screenshot 2024-06-18 123120.jpg";
    replace = "/sites/Docs/CMSResources/CMS365/Screenshot 2024-06-18 123120.jpg";
    result = `To activate the KWIZ Forms feature in your list you should click the "KWIZ Forms Display Mode" button:

![](/sites/Docs/CMSResources/CMS365/Screenshot 2024-06-18 123120.jpg)

Now select one "Side Panel" or "Full Page" for the display mode:`;
    assert.strictEqual(replaceAll(string, find, replace, true), result);

});

test('capitalizeFirstLetter', async t => {
    assert.strictEqual(capitalizeFirstLetter(), "");
    assert.strictEqual(capitalizeFirstLetter("a"), "A");
    assert.strictEqual(capitalizeFirstLetter("hello"), "Hello");
    assert.strictEqual(capitalizeFirstLetter("hello world!"), "Hello world!");
    assert.strictEqual(capitalizeFirstLetter("helloworld"), "Helloworld");
    assert.strictEqual(capitalizeFirstLetter(""), "");
});

test('escapeXml', async t => {
    assert.strictEqual(escapeXml(), "");
    assert.strictEqual(escapeXml(""), "");
    assert.strictEqual(escapeXml(" "), " ");
    assert.strictEqual(escapeXml("<test />"), "&lt;test /&gt;");
    assert.strictEqual(escapeXml(`full scope: <>&'"`), `full scope: &lt;&gt;&amp;'"`);
    assert.strictEqual(escapeXml(undefined, true), "");
    assert.strictEqual(escapeXml("", true), "");
    assert.strictEqual(escapeXml(" ", true), " ");
    assert.strictEqual(escapeXml("<test />", true), "&lt;test /&gt;");
    assert.strictEqual(escapeXml(`full scope: <>&'"`, true), `full scope: &lt;&gt;&amp;&apos;&quot;`);
});

test('replaceRegex', t => {
    /** Match anything between {zone:*} */
    var match = /{zone:\w+}/gi;

    var source = `text {zone:one} {zone:two}
more text
{zone:three}`;
    var result = `text ONE TWO
more text
THREE`;

    assert.strictEqual(replaceRegex(source, match, m => m.slice(1, m.length - 1).split(':')[1].toLocaleUpperCase()), result);

    /** match: "](______)" */
    match = /]\(.+\)/gi;
    source = '[name:root](https://kwizcom.sharepoint.com/:fl:/g/contentstorage)';
    result = '[name:root](https~~~~//kwizcom.sharepoint.com/~~~~fl~~~~/g/contentstorage)';
    assert.strictEqual(replaceRegex(source, match, m => m.replace(/:/gi, "~~~~")), result);
});

test('maskString', async t => {
    assert.strictEqual(maskString("abcdefg"), "ab*****fg");
    assert.strictEqual(maskString("ab"), "ab*****ab");
    assert.strictEqual(maskString(""), "*****");
    assert.strictEqual(maskString("abcdefg", { mask: "..." }), "ab...fg");
    assert.strictEqual(maskString("abcdefg", { mask: "...", start: 0, end: 0 }), "...");
    assert.strictEqual(maskString("abcdefg", { mask: "...", start: 1, end: 1 }), "a...g");
});

test('ReplaceTokensInDictionary', async t => {
    const tokens = { "t1": "token1", "t2": "token 2" };
    let dic = {};
    let expected = {};

    dic = { a: "hello" };
    expected = { a: "hello" };
    ReplaceTokensInDictionary(dic, tokens);
    assert.strictEqual(JSON.stringify(dic), JSON.stringify(expected));

    dic = { a: "hello", b: "hello [t1]" };
    expected = { a: "hello", b: "hello token1" };
    ReplaceTokensInDictionary(dic, tokens);
    assert.strictEqual(JSON.stringify(dic), JSON.stringify(expected));

    dic = { a: "hello", b: "hello [t1] [t2]", c: "[t2]" };
    expected = { a: "hello", b: "hello token1 token 2", c: "token 2" };
    ReplaceTokensInDictionary(dic, tokens);
    assert.strictEqual(JSON.stringify(dic), JSON.stringify(expected));
});

test('splitString', async t => {
    const str = "abcd|1234|efgh|5678";
    let expected = [
        'abc', 'd|1',
        '234', '|ef',
        'gh|', '567',
        '8'
    ];
    assert.strictEqual(JSON.stringify(splitString(str, { maxLength: 3 })), JSON.stringify(expected));
    expected = [
        'abcd', '1234',
        'efgh', '5678'
    ];
    assert.strictEqual(JSON.stringify(splitString(str, { marker: "|" })), JSON.stringify(expected));
    expected = [
        'ab', 'cd', '12', '34',
        'ef', 'gh', '56', '78'
    ];
    assert.strictEqual(JSON.stringify(splitString(str, { marker: "|", maxLength: 2 })), JSON.stringify(expected));
});


test('codeNameToTitle', async t => {
    assert.strictEqual(codeNameToTitle("acctType"), "Acct type");
    assert.strictEqual(codeNameToTitle("acct_type", true), "Acct Type");

    assert.strictEqual(codeNameToTitle("acct"), "Acct");
    assert.strictEqual(codeNameToTitle("acct", true), "Acct");

    assert.strictEqual(codeNameToTitle("ABC"), "A b c");
    assert.strictEqual(codeNameToTitle("ABC", true), "A B C");
});
