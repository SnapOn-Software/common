import assert from 'assert/strict';
import test from 'node:test';
import { getDateFromToken, getTotalDaysInMonth, isISODate, isISODateUTC, isNowToken, isStandardDate, isTodayToken, shiftMonths } from "./date";

test('isTodayToken', async t => {
    await t.test('emptyString', () => assert.strictEqual(isTodayToken(''), false));
    await t.test('today string', () => assert.strictEqual(isTodayToken('today'), false));
    await t.test('spaces in string with []', () => assert.strictEqual(isTodayToken('[ to day]'), false));
    await t.test('space at end of [today] string', () => assert.strictEqual(isTodayToken('[today ]'), false));
    await t.test('characters before [today] string', () => assert.strictEqual(isTodayToken('asd[today]'), false));
    await t.test('characters after [today] string', () => assert.strictEqual(isTodayToken('[today]adsd'), true));
    await t.test('characters and space after [today] string', () => assert.strictEqual(isTodayToken('[today] asd'), true));
    await t.test('[today] string', () => assert.strictEqual(isTodayToken('[today]'), true));
});

test('isNowToken', async t => {
    await t.test('emptyString', () => assert.strictEqual(isNowToken(''), false));
    await t.test('now string', () => assert.strictEqual(isNowToken('now'), false));
    await t.test('beginning space in string with []', () => assert.strictEqual(isNowToken('[ now]'), false));
    await t.test('ending space in string with []', () => assert.strictEqual(isNowToken('[now ]'), false));
    await t.test('characters before [now] string', () => assert.strictEqual(isNowToken('asd[now]'), false));
    await t.test('characters after [now] string', () => assert.strictEqual(isNowToken('[now]adsd'), true));
    await t.test('characters and space after [now] string', () => assert.strictEqual(isNowToken('[now] asd'), true));
    await t.test('[today] string', () => assert.strictEqual(isNowToken('[now]'), true));
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
    await t.test('UTC date milliseconds', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14.954Z'), false));
    await t.test('standard date milliseconds', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14.954'), false));
    await t.test('UTC date seconds', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14Z'), false));
    await t.test('standard date seconds', () => assert.strictEqual(isStandardDate('2023-08-21T15:54:14'), false));
    await t.test('standard date minutes', () => assert.strictEqual(isStandardDate('2023-08-21T15:54'), true));
});

test('isISODate', async t => {
    await t.test('emptyString', () => assert.strictEqual(isISODate(''), false));
    await t.test('UTC date milliseconds', () => assert.strictEqual(isISODate('2023-08-21T15:54:14.954Z'), true));
    await t.test('standard date milliseconds', () => assert.strictEqual(isISODate('2023-08-21T15:54:14.954'), true));
    await t.test('UTC date seconds', () => assert.strictEqual(isISODate('2023-08-21T15:54:14Z'), true));
    await t.test('standard date seconds', () => assert.strictEqual(isISODate('2023-08-21T15:54:14'), true));
    await t.test('standard date minutes', () => assert.strictEqual(isISODate('2023-08-21T15:54'), false));
});

test('isISODateUTC', async t => {
    await t.test('emptyString', () => assert.strictEqual(isISODateUTC(''), false));
    await t.test('UTC date milliseconds', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14.954Z'), true));
    await t.test('standard date milliseconds', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14.954'), false));
    await t.test('UTC date seconds', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14Z'), true));
    await t.test('standard date seconds', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54:14'), false));
    await t.test('standard date minutes', () => assert.strictEqual(isISODateUTC('2023-08-21T15:54'), false));
});

test('getTotalDaysInMonth', async t => {
    var d = new Date("01-01-2023");
    await t.test('first day, 1st 31 day month, 2023', () => assert.strictEqual(getTotalDaysInMonth(d), 31));

    d = new Date("09-01-2023");
    await t.test('first day of 9th month, 30 days, 2023', () => assert.strictEqual(getTotalDaysInMonth(d), 30));

    d = new Date("02-01-2023");
    await t.test('first day of 2nd month, 28 days, 2023', () => assert.strictEqual(getTotalDaysInMonth(d), 28));

    d = new Date("02-01-2024"); //leap year
    await t.test('leap year, 1st day of 2nd month, 29 days, 2024', () => assert.strictEqual(getTotalDaysInMonth(d), 29));
});

test('shiftMonths', async t => {
    var d = new Date("01-31-2023");
    shiftMonths(d, 1)
    await t.test('tests for month synching, 1 shift', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('last day of 1st month, 1 shift, non-leap year', () => assert.strictEqual(d.getDate(), 28));

    d = new Date("01-31-2023");
    shiftMonths(d, 13)
    await t.test('tests for month synching, 13 shift', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('last day of 1st month, 13 shift, leap year post shift', () => assert.strictEqual(d.getDate(), 29)); //leap year

    d = new Date("01-31-2023");
    shiftMonths(d, -11)
    await t.test('tests for month synching, -11 shift', () => assert.strictEqual(d.getMonth() + 1, 2));
    await t.test('last day of 1st month, -11 shift, non-leap year', () => assert.strictEqual(d.getDate(), 28));
});