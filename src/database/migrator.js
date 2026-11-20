'use strict';

const { SequelizeStorage, Umzug } = require('umzug');
const migrations = require('./migrations');

/** Migrations are recorded in "SequelizeMeta", as sequelize-cli does. */
function createMigrator(sequelize, logger = undefined) {
    return new Umzug({
        migrations: migrations.map(({ name, up, down }) => ({ name, up, down })),
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger,
    });
}

module.exports = { createMigrator };
