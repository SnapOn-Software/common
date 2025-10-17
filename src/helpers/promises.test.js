import assert from 'assert/strict';
import test from 'node:test';
import { promiseLock, promiseOnce, sleepAsync } from './promises';


test('promiseOnce', async t => {
    let promiseOnceTester = promiseOnce("promiseOnceTester", async() => {
        return Date.now();
    });

    let value = await promiseOnceTester;
    await t.test("First call", t => assert.strictEqual(value > 0, true));
    //check cache
    let value2 = await promiseOnceTester;
    await t.test("Second call", t => assert.strictEqual(value === value2, true));
    let value3 = await promiseOnceTester;
    await t.test("Third call", t => assert.strictEqual(value === value3, true));
});

test('promiseLock', async t => {

    let promiseLockTester = async() => {
        return new Date().getTime();
    };

    let p1 = promiseLock("promiseLockTest", promiseLockTester);
    let p2 = promiseLock("promiseLockTest", promiseLockTester);

    let v1 = await p1;
    let v2 = await p2;

    await sleepAsync(1);

    let v3 = await promiseLock("promiseLockTest", promiseLockTester);

    await t.test("During lock", t => assert.strictEqual(v1 === v2, true));
    await t.test("After lock", t => assert.strictEqual(v1 === v3, false));
});