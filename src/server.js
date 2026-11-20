'use strict';

const { getConfig } = require('./config/env');
const { getSequelize, ensureDatabaseExists, closeDatabase } = require('./config/database');
const { createMigrator } = require('./database/migrator');
const { createApp } = require('./app');
const { startScheduler } = require('./jobs/scheduler');
const { closeIntegrations } = require('./services/container');
const { seedAdmin } = require('./services/user.service');
const logger = require('./utils/logger');

/**
 * Validates the configuration, prepares the database (create when allowed, migrations, admin
 * seed), listens and starts the scheduler. RabbitMQ and storage connect on first use.
 */
async function start() {
    const config = getConfig();
    if (config.db.createIfMissing) await ensureDatabaseExists(config.db);
    const sequelize = getSequelize();
    await sequelize.authenticate();
    if (config.db.migrate) {
        const applied = await createMigrator(sequelize).up();
        if (applied.length) logger.info(`Migrations applied: ${applied.map((m) => m.name).join(', ')}`);
    }
    await seedAdmin();

    const server = createApp().listen(config.port, () => logger.info(`Server listening on port ${config.port}`));
    const tasks = startScheduler();

    let stopping = false;
    const shutdown = async (signal) => {
        if (stopping) return;
        stopping = true;
        logger.info(`${signal} received, shutting down`);
        tasks.forEach((task) => task.stop());
        server.close();
        await closeIntegrations().catch(() => undefined);
        await closeDatabase().catch(() => undefined);
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
    return server;
}

module.exports = { start };
