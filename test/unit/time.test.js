'use strict';

const time = require('../../src/utils/time');

const TZ = 'America/Bogota';
const iso = (d) => d.toISOString();

describe('time helpers (Intl, no manual offsets)', () => {
    it('formats instants in Bogotá', () => {
        expect(time.formatDateTime('2026-03-10T04:30:00Z', TZ)).toBe('09-03-2026 23:30');
        expect(time.formatDate('2026-03-10T05:00:00Z', TZ)).toBe('10-03-2026');
        expect(time.isoDate('2026-03-10T04:59:59Z', TZ)).toBe('2026-03-09');
    });

    it('computes the local day range', () => {
        const { start, end } = time.dayRange(new Date('2026-03-10T03:00:00Z'), TZ);
        expect(iso(start)).toBe('2026-03-09T05:00:00.000Z');
        expect(iso(end)).toBe('2026-03-10T04:59:59.999Z');
    });

    it('computes the previous day range (the daily report)', () => {
        const { start, end } = time.previousDayRange(new Date('2026-03-11T05:05:00Z'), TZ);
        expect(iso(start)).toBe('2026-03-10T05:00:00.000Z');
        expect(iso(end)).toBe('2026-03-11T04:59:59.999Z');
    });

    it('computes the ISO week (Monday to Sunday) in Bogotá', () => {
        // Sunday 15 March 23:30 Bogotá is still the week of Monday 9 March.
        const sunday = time.weekRange(new Date('2026-03-16T04:30:00Z'), TZ);
        expect(iso(sunday.start)).toBe('2026-03-09T05:00:00.000Z');
        expect(iso(sunday.end)).toBe('2026-03-16T04:59:59.999Z');
        const monday = time.weekRange(new Date('2026-03-16T05:00:00Z'), TZ);
        expect(iso(monday.start)).toBe('2026-03-16T05:00:00.000Z');
    });

    it('handles a time zone with daylight saving time', () => {
        // New York switches to UTC-4 on 8 March 2026: that local day lasts 23 hours.
        const { start, end } = time.dayRange(new Date('2026-03-08T12:00:00Z'), 'America/New_York');
        expect(iso(start)).toBe('2026-03-08T05:00:00.000Z');
        expect(iso(end)).toBe('2026-03-09T03:59:59.999Z');
    });

    it('parses DD-MM-YYYY strictly', () => {
        expect(time.parseDayMonthYear('10-03-2026')).toEqual({ year: 2026, month: 3, day: 10 });
        expect(time.parseDayMonthYear('31-02-2026')).toBeNull();
        expect(time.parseDayMonthYear('2026-03-10')).toBeNull();
        expect(time.parseDayMonthYear(undefined)).toBeNull();
    });

    it('builds a range from two local dates', () => {
        const { start, end } = time.localDateRange({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 31 }, TZ);
        expect(iso(start)).toBe('2026-03-01T05:00:00.000Z');
        expect(iso(end)).toBe('2026-04-01T04:59:59.999Z');
    });

    it('exposes the local calendar fields', () => {
        expect(time.zonedParts(new Date('2026-03-16T04:30:00Z'), TZ)).toMatchObject({ day: 15, hour: 23, isoWeekday: 7 });
    });
});
