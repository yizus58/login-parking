const cron = require('node-cron');
const logger = require('../utils/logger');
const { executeDailyTask, executeReportTask } = require('../services/tasks/cronService');

function initCronJobs() {
    const cronTimeDelay = process.env.CRON_HOUR_DETERMINATION;
    const cronReport = process.env.CRON_SECONDS;
    logger.info(`Cron job diario inicializado con la hora ${cronTimeDelay}`);

    cron.schedule(cronTimeDelay, async () => {
        const task = await executeDailyTask();

        if (!task) {
            logger.info('No se pudo ejecutar la tarea diaria');
            return null;
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });


    cron.schedule(cronTimeDelay, async () => {
        const report = await executeReportTask();
        if (!report) {
            logger.info('No se pudo ejecutar la tarea diaria');
            return null;
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });
}

module.exports = initCronJobs;