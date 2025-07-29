import assert from 'assert/strict';
import test from 'node:test';
import { getRandomId, getUniqueId } from "./random"; 

test('getRandomId', async t => {
    for(let i=1; i<3; i++){
        await t.test('dateCharacter', () => assert.notDeepEqual(getRandomId(), getRandomId()));
    }
});

test('getUniqueId', async t => {
    let results19 = ['a', 'b', '8', '9'];

    await t.test('[14]=4', () => assert.deepEqual(getUniqueId()[14], '4'), true);
    await t.test('[8]=-', () => assert.deepEqual(getUniqueId()[8], '-'), true);
    await t.test('[19]=a/b/8/9', () => assert.deepEqual(results19.includes(getUniqueId()[19]), true));
});
