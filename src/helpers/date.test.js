import assert from 'assert/strict';
import test from 'node:test';
import { getDateFromToken, getTotalDaysInMonth, isISODate, isISODateUTC, isNowToken, isStandardDate, isTodayToken, shiftMonths } from "./date";

test('isTodayToken', async t => {
    await t.test('emptyString', () => assert.strictEqual(isTodayToken(''), false));
    await t.test("'today'", () => assert.strictEqual(isTodayToken('today'), false));
    await t.test("'[ to day]'", () => assert.strictEqual(isTodayToken('[ to day]'), false));
    await t.test("'[today ]'", () => assert.strictEqual(isTodayToken('[today ]'), false));
    await t.test("'asd[today]'", () => assert.strictEqual(isTodayToken('asd[today]'), false));
    await t.test("'[today]adsd'", () => assert.strictEqual(isTodayToken('[today]adsd'), true));
    await t.test("'[today] asd'", () => assert.strictEqual(isTodayToken('[today] asd'), true));
    await t.test("'[today]'", () => assert.strictEqual(isTodayToken('[today]'), true));
});

test('isNowToken', async t => {
    await t.test('emptyString', () => assert.strictEqual(isNowToken(''), false));
    await t.test("'now'", () => assert.strictEqual(isNowToken('now'), false));
    await t.test("'[ now]'", () => assert.strictEqual(isNowToken('[ now]'), false));
    await t.test("'[now ]'", () => assert.strictEqual(isNowToken('[now ]'), false));
    await t.test("'asd[now]'", () => assert.strictEqual(isNowToken('asd[now]'), false));
    await t.test("'[now]adsd'", () => assert.strictEqual(isNowToken('[now]adsd'), true));
    await t.test("'[now] asd'", () => assert.strictEqual(isNowToken('[now] asd'), true));
    await t.test("'[now]'", () => assert.strictEqual(isNowToken('[now]'), true));
});

test('getDateFromToken', async t => {
    let now = new Date();
    var result = getDateFromToken('[today]+1', { now: now });
    var expected = new Date(now.getTime());
    expected.setDate(expected.getDate() + 1);
    await t.test('1. [today]+1', () => assert.strictEqual(result.getTime(), expected.getTime()));

    result = getDateFromToken('[today]-1', { now: now });
    expected = new Date(now.getTime());
    expected.setDate(expected.getDate() - 1);
    await t.test('1. [today]-1', () => assert.strictEqual(result.getTime(), expected.getTime()));

    result = getDateFromToken('[now]+15', { now: now });
    expected = new Date(now.getTime());
    expected.setMinutes(expected.getMinutes() + 15);
    await t.test('1. [now]+15', () => assert.strictEqual(result.getTime(), expected.getTime()));

    result = getDateFromToken('[now]-15', { now: now });
    expected = new Date(now.getTime());
    expected.setMinutes(expected.getMinutes() - 15);
    await t.test('1. [now]-15', () => assert.strictEqual(result.getTime(), expected.getTime()));

    let test = new Date(now.getTime());
    test.setHours(0, 0, 0, 0);

    result = getDateFromToken('[today]+1', { now: now, zeroTimeForToday: true });
    expected = new Date(test.getTime());
    expected.setDate(expected.getDate() + 1);
    await t.test('2. [today]+1', () => assert.strictEqual(result.getTime(), expected.getTime()));

    result = getDateFromToken('[today]-1', { now: now, zeroTimeForToday: true });
    expected = new Date(test.getTime());
    expected.setDate(expected.getDate() - 1);
    await t.test('2. [today]-1', () => assert.strictEqual(result.getTime(), expected.getTime()));

});

test('isStandardDate', async t => {
    await t.test('emptyString', () => assert.strictEqual(isStandardDate(''), false));
    await t.test('2023-08-21T15:54:14.954Z', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14.954Z'), false));
    await t.test('2023-08-21T15:54:14.954', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14.954'), false));
    await t.test('2023-08-21T15:54:14Z', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14Z'), false));
    await t.test('2023-08-21T15:54:14', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14'), false));
    await t.test('2023-08-21T15:54', () => assert.strictEqual(isStandardDate('2023-08-21T15:54'), true));
});

test('isISODate', async t => {
    await t.test('emptyString', () => assert.strictEqual(isISODate(''), false));
    await t.test('2023-08-21T15:54:14.954Z', () => assert.strictEqual(isISODate('2023-08-21T15:54:14.954Z'), true));
    await t.test('2023-08-21T15:54:14.954', () => assert.strictEqual(isISODate('2023-08-21T15:54:14.954'), true));
    await t.test('2023-08-21T15:54:14Z', () => assert.strictEqual(isISODate('2023-08-21T15:54:14Z'), true));
    await t.test('2023-08-21T15:54:14', () => assert.strictEqual(isISODate('2023-08-21T15:54:14'), true));
    await t.test('2023-08-21T15:54', () => assert.strictEqual(isISODate('2023-08-21T15:54'), false));
});

test('isISODateUTC', async t => {
    await t.test('emptyString', () => assert.strictEqual(isISODateUTC(''), false));
    await t.test('2023-08-21T15:54:14.954Z', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14.954Z'), true));
    await t.test('2023-08-21T15:54:14.954', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14.954'), false));
    await t.test('2023-08-21T15:54:14Z', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14Z'), true));
    await t.test('2023-08-21T15:54:14', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14'), false));
    await t.test('2023-08-21T15:54', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54'), false));
});

test('getTotalDaysInMonth', async t => {
    var d = new Date("01-01-2023");
    await t.test('01-01-2023', () => assert.strictEqual(getTotalDaysInMonth(d), 31));

    d = new Date("09-01-2023");
    await t.test('09-01-2023', () => assert.strictEqual(getTotalDaysInMonth(d), 30));

    d = new Date("02-01-2023");
    await t.test('02-01-2023', () => assert.strictEqual(getTotalDaysInMonth(d), 28));

    d = new Date("02-01-2024"); //leap year
    await t.test('02-01-2024', () => assert.strictEqual(getTotalDaysInMonth(d), 29));
});

test('shiftMonths', async t => {
    var d = new Date("01-31-2023");
    shiftMonths(d, 1)
    await t.test('01-31-2023.getMonth() + 1, 1', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('d.getDate, 1', () => assert.strictEqual(d.getDate(), 28));

    d = new Date("01-31-2023");
    shiftMonths(d, 13)
    await t.test('01-31-2023.getMonth() + 1, 13', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('d.getDate, 13', () => assert.strictEqual(d.getDate(), 29)); //leap year

    d = new Date("01-31-2023");
    shiftMonths(d, -11)
    await t.test('01-31-2023.getMonth() + 1, -11', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('d.getDate, -11', () => assert.strictEqual(d.getDate(), 28));
});