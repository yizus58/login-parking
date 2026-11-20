'use strict';

/**
 * Time zone helpers built on Intl (no manual "-5 hours"). Dates are stored as UTC instants
 * (timestamptz); a "day" or "week" is always the calendar day/week in the given time zone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const formatters = new Map();

function partsFormatter(timeZone) {
    if (!formatters.has(timeZone)) {
        formatters.set(
            timeZone,
            new Intl.DateTimeFormat('en-US', {
                timeZone,
                hourCycle: 'h23',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                weekday: 'short',
            }),
        );
    }
    return formatters.get(timeZone);
}

/** Calendar fields of `date` as seen in `timeZone`. */
function zonedParts(date, timeZone) {
    const parts = {};
    for (const { type, value } of partsFormatter(timeZone).formatToParts(date)) parts[type] = value;
    const weekdays = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        isoWeekday: weekdays[parts.weekday],
    };
}

/** Offset (ms) of `timeZone` from UTC at the instant `date`. */
function offsetMs(date, timeZone) {
    const p = zonedParts(date, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight of year-month-day in `timeZone`. */
function startOfLocalDay(year, month, day, timeZone) {
    const guess = Date.UTC(year, month - 1, day);
    let instant = guess - offsetMs(new Date(guess), timeZone);
    // Second pass handles an offset change between the guess and the result.
    instant = guess - offsetMs(new Date(instant), timeZone);
    return new Date(instant);
}

/** [start, end] instants of the local calendar day containing `date`. */
function dayRange(date, timeZone) {
    const p = zonedParts(date, timeZone);
    const start = startOfLocalDay(p.year, p.month, p.day, timeZone);
    const p2 = zonedParts(new Date(start.getTime() + DAY_MS + 3 * 3600 * 1000), timeZone);
    const next = startOfLocalDay(p2.year, p2.month, p2.day, timeZone);
    return { start, end: new Date(next.getTime() - 1) };
}

/** [start, end] of the local ISO week (Monday 00:00 to Sunday 23:59:59.999) containing `date`. */
function weekRange(date, timeZone) {
    const p = zonedParts(date, timeZone);
    const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - (p.isoWeekday - 1)));
    const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
    const start = startOfLocalDay(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), timeZone);
    const end = startOfLocalDay(nextMonday.getUTCFullYear(), nextMonday.getUTCMonth() + 1, nextMonday.getUTCDate(), timeZone);
    return { start, end: new Date(end.getTime() - 1) };
}

/** Parses "DD-MM-YYYY" (strictly); null when invalid. */
function parseDayMonthYear(value) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value ?? ''));
    if (!match) return null;
    const [day, month, year] = match.slice(1).map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return { year, month, day };
}

/** [start of first day, end of last day] for two "DD-MM-YYYY" dates in `timeZone`. */
function localDateRange(from, to, timeZone) {
    const start = startOfLocalDay(from.year, from.month, from.day, timeZone);
    const { end } = dayRange(startOfLocalDay(to.year, to.month, to.day, timeZone), timeZone);
    return { start, end };
}

const pad = (n) => String(n).padStart(2, '0');

/** "DD-MM-YYYY HH:mm" in `timeZone`. */
function formatDateTime(date, timeZone) {
    const p = zonedParts(new Date(date), timeZone);
    return `${pad(p.day)}-${pad(p.month)}-${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}

/** "DD-MM-YYYY" in `timeZone`. */
function formatDate(date, timeZone) {
    const p = zonedParts(new Date(date), timeZone);
    return `${pad(p.day)}-${pad(p.month)}-${p.year}`;
}

/** "YYYY-MM-DD" in `timeZone`. */
function isoDate(date, timeZone) {
    const p = zonedParts(new Date(date), timeZone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The local calendar day before the one containing `date`. */
function previousDayRange(date, timeZone) {
    const { start } = dayRange(date, timeZone);
    return dayRange(new Date(start.getTime() - 1), timeZone);
}

module.exports = {
    zonedParts,
    dayRange,
    weekRange,
    previousDayRange,
    parseDayMonthYear,
    localDateRange,
    formatDateTime,
    formatDate,
    isoDate,
};
