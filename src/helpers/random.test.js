import assert from 'assert/strict';
import test from 'node:test';
import { getRandomId, getUniqueId } from "./random"; 

test('getRandomId', async t => {
    for(let i=1; i<3; i++){
        await t.test('tests for random', () => assert.notDeepEqual(getRandomId(), getRandomId()));
    }
});

test('getUniqueId', async t => {
    let results19 = ['a', 'b', '8', '9'];

    await t.test('checks for 4 after 12 characters', () => assert.deepEqual(getUniqueId()[14], '4'));
    await t.test('tests breaks in code', () => assert.deepEqual(getUniqueId()[8], '-'));
    await t.test('19th character=a/b/8/9', () => assert.ok(results19.includes(getUniqueId()[19])));
});
