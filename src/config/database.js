'use strict';

const { Client } = require('pg');
const { Sequelize } = require('sequelize');
const { getConfig } = require('./env');
const logger = require('../utils/logger');

let sequelize = null;

function sequelizeOptions(db) {
    return {
        dialect: 'postgres',
        logging: db.logging ? (sql) => logger.debug(sql) : false,
        define: { timestamps: false },
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    };
}

/** The shared Sequelize instance (created on first use from the configuration). */
function getSequelize() {
    if (!sequelize) {
        const { db } = getConfig();
        sequelize = db.url
            ? new Sequelize(db.url, sequelizeOptions(db))
            : new Sequelize(db.name, db.user, db.password, { host: db.host, port: db.port, ...sequelizeOptions(db) });
    }
    return sequelize;
}

/** Creates DB_NAME when it does not exist (local development convenience). */
async function ensureDatabaseExists(db = getConfig().db) {
    if (db.url) return false;
    const client = new Client({ host: db.host, port: db.port, user: db.user, password: db.password, database: 'postgres' });
    await client.connect();
    try {
        const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db.name]);
        if (rows.length > 0) return false;
        await client.query(`CREATE DATABASE "${db.name.replace(/"/g, '""')}"`);
        logger.info(`Database ${db.name} created`);
        return true;
    } finally {
        await client.end();
    }
}

/** Closes the pool; models are re-created on the next getModels() (they belong to the instance). */
async function closeDatabase() {
    require('../models').resetModels();
    if (sequelize) {
        const current = sequelize;
        sequelize = null;
        await current.close();
    }
}

module.exports = { getSequelize, ensureDatabaseExists, closeDatabase };
