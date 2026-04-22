/** 
 * a date helper that is not relying on SharePoint or any utils at all
 * can be synced to the server code and external projects
 * do not add code that needs SP or utils -> move it to utils/date
 */

import { endsWith } from "./strings";
import { isDate, isNullOrUndefined, isString } from "./typecheckers";

export function isISODateUTC(d: string) {
    //2023-08-21T15:54:14.954Z = true
    //2023-08-21T15:54:14.954 = false
    //2023-08-21T15:54:14Z = true
    //2023-08-21T15:54:14 = false
    //2023-08-21T15:54 = false
    return isISODate(d) && endsWith(d, "Z", true);
}

export function isISODate(d: string) {
    //2023-08-21T15:54:14.954Z = true
    //2023-08-21T15:54:14.954 = true
    //2023-08-21T15:54:14Z = true
    //2023-08-21T15:54:14 = true
    //2023-08-21T15:54 = false
    return isString(d) && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/.test(d);
}

export function isStandardDate(d: string) {
    //2023-08-21T15:54:14.954Z = false
    //2023-08-21T15:54:14.954 = false
    //2023-08-21T15:54:14Z = false
    //2023-08-21T15:54:14 = false
    //2023-08-21T15:54 = true
    return isString(d) && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.test(d);
}

export function parseISODate(a: string): Date | null {
    if (!Date.prototype.toISOString) {
        if (a.length < 19) {
            return null;
        }
        var i = Number(a.substr(0, 4)),
            f = Number(a.substr(5, 2)),
            d = Number(a.substr(8, 2)),
            h = Number(a.substr(11, 2)),
            e = Number(a.substr(14, 2)),
            g = Number(a.substr(17, 2));
        if (isNaN(i) || isNaN(f) || isNaN(d) || isNaN(h) || isNaN(e) || isNaN(g)) {
            return null;
        }
        // b = new Date(Date.UTC(i, f - 1, d, h, e, g));
        return new Date(Date.UTC(i, f - 1, d, h, e, g));
    } else {
        return new Date(a);
    }
}

/** Get now date, without seconds or milliseconds. */
export function getNow() {
    let now = new Date();
    now.setSeconds(0, 0);
    return now;
}
/** Get today date, without hours, minutes, seconds or milliseconds. */
export function getToday() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

// eslint-disable-next-line no-shadow
export enum DateFormats {
    YMD = "yyyy-MM-dd"
}

const ticks1Second = 1 * 1000;
const ticks1Minute = 60 * ticks1Second;
const ticks10Minutes = 10 * ticks1Minute;
const ticks1Hour = 6 * ticks10Minutes;
const ticks24Hours = 24 * ticks1Hour;

export const shiftDateValues = {
    s1: ticks1Second,
    m1: ticks1Minute,
    m10: ticks10Minutes,
    h1: ticks1Hour,
    h24: ticks24Hours,
    w1: ticks24Hours * 7
} as const;
/** this option just adds/removes seconds/minutes/hours - does NOT respects the number of days in a month, and leap year etc
 * use changeDate if you need to work on real dates
 */
export function shiftDate(shift: number | keyof typeof shiftDateValues, date = new Date()) {
    return new Date(date.getTime() + (shiftDateValues[shift] || shift));
}
/** this option respects the number of days in a month, and leap year etc
 * use shiftDate if you don't need to respect real dates
 */
export function changeDate(options: { years?: number; months?: number; days?: number; hours?: number; minutes?: number; }, startDate?: Date): Date {
    let newDate = isDate(startDate) ? new Date(startDate.getTime()) : new Date();//today, or the day that was passed

    if (options) {
        if (!isNullOrUndefined(options.years))
            newDate.setFullYear(newDate.getFullYear() + options.years);

        if (!isNullOrUndefined(options.months))
            newDate.setMonth(newDate.getMonth() + options.months);

        if (!isNullOrUndefined(options.days))
            options.hours = (isNullOrUndefined(options.hours) ? 0 : options.hours) + (options.days * 24);

        if (!isNullOrUndefined(options.hours))
            options.minutes = (isNullOrUndefined(options.minutes) ? 0 : options.minutes) + (options.hours * 60);
        if (!isNullOrUndefined(options.minutes) && options.minutes !== 0)
            newDate = new Date(newDate.getTime() + (options.minutes * 60 * 1000));
    }

    return newDate;
}

export function cloneDate(date: Date) {
    return new Date(date.getTime());
}

/** Returns a new date object adjusted for the time format */
export function getDateFromToken(str: string, options?: { now?: Date; zeroTimeForToday?: boolean; }) {
    let now = options && options.now ? new Date(options.now.getTime()) : new Date();

    if (!isTodayToken(str) && !isNowToken(str)) return now;
    let token: "Now" | "Today" = isTodayToken(str) ? "Today" : "Now";
    var includeTime = token === "Now";
    if (!includeTime && options && options.zeroTimeForToday) {
        now.setHours(0, 0, 0, 0);
    }

    var n = str.replace(new RegExp(`\\[${token}\\]`, "im"), "");
    n = n.replace(/\s/g, "");
    var offset = n && n !== "" ? Number(n) : 0;

    if (includeTime) {
        now.setMinutes(now.getMinutes() + offset);
    } else {
        now.setDate(now.getDate() + offset);
    }

    return now;
}

export function isTodayToken(str: string) {
    return str.match(/^\[today\]/im) !== null;
}
export function isNowToken(str: string) {
    return str.match(/^\[now\]/im) !== null;
}

/** Get the number of seconds from date (in the past) to now */
export function getSecondsElapsed(from: Date) {
    let secondsElapsed = (new Date().getTime() - from.getTime()) / 1000;
    return secondsElapsed;
}

/** Get the total number of days in a given month specified by a date object  */
export function getTotalDaysInMonth(obj: Date) {
    if (isDate(obj)) {
        let d = new Date(obj.getFullYear(), obj.getMonth() + 1, 0);
        return d.getDate();
    }
    return 0;
}

/** Shifts the date by a certain number of months and takes into account the total number of days in the new month. 
 * For example, if you shift January 31st by one month it will return February 28th (29th for a leap year) instead of March 3rd (2nd in leap year)
  */
export function shiftMonths(obj: Date, months: number) {
    let desiredDate = obj.getDate();
    //move to first day to avoid skipping months (ie. Jan 31 -> March 3)
    obj.setDate(1);
    obj.setMonth(obj.getMonth() + months);
    obj.setDate(Math.min(desiredDate, getTotalDaysInMonth(obj)));
}

/** 
 * Gets last day of month given a date
  */
export function getLastDayOfMonth(obj: Date) {
    return new Date(obj.getFullYear(), obj.getMonth() + 1, 0);
}

// in miliseconds
var units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: 24 * 60 * 60 * 1000 * 365 / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
//const rtf = new Intl.RelativeTimeFormat('en', { style: 'short' });

export function getRelativeTime(d1: Date, d2 = new Date()) {
    try {
        var elapsed = d1.getTime() - d2.getTime();

        // "Math.abs" accounts for both "past" & "future" scenarios
        for (var u in units)
            if (Math.abs(elapsed) > units[u] || u === 'second')
                return rtf.format(Math.round(elapsed / units[u]), u as Intl.RelativeTimeFormatUnit);
    } catch (e) {
        return "";
    }
}