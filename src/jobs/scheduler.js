'use strict';

const cron = require('node-cron');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');
const { runDailyReports } = require('../services/report.service');
const { getNotifications, getStorage } = require('../services/container');

/**
 * Runs `task` on `expression` in `timeZone`, skipping a tick while the previous run is still
 * going. Returns the node-cron task.
 */
function scheduleExclusive(expression, timeZone, name, task, scheduler = cron) {
    if (!scheduler.validate(expression)) throw new Error(`Invalid cron expression for ${name}: ${expression}`);
    let running = false;
    return scheduler.schedule(
        expression,
        async () => {
            if (running) {
                logger.warn(`${name} is still running; tick skipped`);
                return;
            }
            running = true;
            try {
                await task();
            } catch (error) {
                logger.error(`${name} failed: ${error.message}`);
            } finally {
                running = false;
            }
        },
        { timezone: timeZone, name },
    );
}

/** The daily report (REPORTS_CRON, default 00:05 in APP_TIMEZONE, for the previous day). */
function startScheduler(scheduler = cron) {
    const { reports, timeZone } = getConfig();
    if (!reports.enabled) return [];
    return [
        scheduleExclusive(reports.cron, timeZone, 'daily-reports', () =>
            runDailyReports({ notifications: getNotifications(), storage: getStorage() }),
        scheduler),
    ];
}

module.exports = { startScheduler, scheduleExclusive };
