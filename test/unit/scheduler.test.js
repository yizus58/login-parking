'use strict';

jest.mock('../../src/services/report.service', () => ({ runDailyReports: jest.fn() }));

const { scheduleExclusive, startScheduler } = require('../../src/jobs/scheduler');
const { runDailyReports } = require('../../src/services/report.service');
const { resetConfig } = require('../../src/config/env');

function fakeCron() {
    const jobs = [];
    return {
        jobs,
        validate: (expression) => expression !== 'bad',
        schedule: (expression, fn, options) => {
            const job = { expression, fn, options, stop: jest.fn() };
            jobs.push(job);
            return job;
        },
    };
}

describe('scheduler', () => {
    afterEach(() => {
        delete process.env.REPORTS_ENABLED;
        delete process.env.REPORTS_CRON;
        resetConfig();
        jest.clearAllMocks();
    });

    it('schedules the daily report once, in Bogotá, at 00:05 by default', () => {
        process.env.REPORTS_ENABLED = 'true';
        resetConfig();
        const cron = fakeCron();
        const tasks = startScheduler(cron);
        expect(tasks).toHaveLength(1);
        expect(cron.jobs[0]).toMatchObject({ expression: '0 5 0 * * *', options: { timezone: 'America/Bogota', name: 'daily-reports' } });
    });

    it('runs the report with the notification and storage integrations', async () => {
        process.env.REPORTS_ENABLED = 'true';
        resetConfig();
        const cron = fakeCron();
        startScheduler(cron);
        await cron.jobs[0].fn();
        expect(runDailyReports).toHaveBeenCalledWith({ notifications: expect.any(Object), storage: expect.any(Object) });
    });

    it('does nothing when disabled', () => {
        process.env.REPORTS_ENABLED = 'false';
        resetConfig();
        const cron = fakeCron();
        expect(startScheduler(cron)).toEqual([]);
        expect(cron.jobs).toEqual([]);
    });

    it('rejects an invalid expression', () => {
        expect(() => scheduleExclusive('bad', 'America/Bogota', 'x', jest.fn(), fakeCron())).toThrow('Invalid cron expression for x: bad');
    });

    it('skips a tick while the previous run is still going and survives failures', async () => {
        const cron = fakeCron();
        let release;
        const task = jest.fn(() => new Promise((resolve) => (release = resolve)));
        scheduleExclusive('* * * * *', 'America/Bogota', 'x', task, cron);
        const first = cron.jobs[0].fn();
        await cron.jobs[0].fn();
        expect(task).toHaveBeenCalledTimes(1);
        release();
        await first;

        const failing = fakeCron();
        const boom = jest.fn().mockRejectedValue(new Error('boom'));
        scheduleExclusive('* * * * *', 'America/Bogota', 'y', boom, failing);
        await expect(failing.jobs[0].fn()).resolves.toBeUndefined();
        await failing.jobs[0].fn();
        expect(boom).toHaveBeenCalledTimes(2);
    });
});
