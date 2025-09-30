const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
const pg = require('pg');
const logger = require("../utils/logger");

dotenv.config();

const { DB_NAME_TEST, DB_USER, DB_PASSWORD, DB_HOST, NODE_ENV } = process.env;

const dbName = NODE_ENV === 'test' ? DB_NAME_TEST : process.env.DB_NAME;

if (typeof global.dbSetupPromise === 'undefined') {
    global.dbSetupPromise = null;
}

const sequelize = new Sequelize(dbName, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: 'postgres',
    logging: false,
});

const createDbIfNotExists = async () => {
    const client = new pg.Client({ user: DB_USER, password: DB_PASSWORD, host: DB_HOST, database: 'postgres' });
    try {
        await client.connect();
        const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (result.rows.length === 0) {
            await client.query(`CREATE DATABASE "${dbName}"`);
            logger.info(`Database "${dbName}" created.`);
        }
    } catch (error) {
        if (error.code !== '42P04') {
            logger.error(`Error creating database: ${error.message}`);
            throw error;
        }
    } finally {
        await client.end();
    }
};

const setupTestDatabase = async () => {
    if (NODE_ENV !== 'test') return;

    if (global.dbSetupPromise) {
        return global.dbSetupPromise;
    }

    global.dbSetupPromise = (async () => {
        try {
            await createDbIfNotExists();
            require('../models/associations');
            await sequelize.sync({ force: true });
            logger.info('Database synchronized successfully by a single test worker.');
        } catch (error) {
            logger.error('Error during test database setup:', error);
            throw error;
        }
    })();

    return global.dbSetupPromise;
};

const connectToDatabase = async () => {
    try {
        await setupTestDatabase();
        await sequelize.authenticate();
    } catch (connectionError) {
        logger.error('Unable to connect to the database:', connectionError);
        throw connectionError;
    }
};

module.exports = {
    sequelize,
    connectToDatabase,
};