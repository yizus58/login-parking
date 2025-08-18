const cron = require('node-cron');
const logger = require('../utils/logger');
const { executeDailyTask } = require('../tasks/cronTask');

function initCronJobs() {
    const cronTimeDelay = process.env.CRON_HOUR_DETERMINATION;
    logger.info(`Cron job diario inicializado con la hora ${cronTimeDelay}`);

    const dailyTask = cron.schedule(cronTimeDelay, async () => {
        const task = await executeDailyTask();

        if (!task) {
            logger.info('No se pudo ejecutar la tarea diaria');
            return null;
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });

    dailyTask.start();
}

module.exports = initCronJobs;