const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
const pg = require('pg');
const logger = require("../utils/logger");
const fs = require('fs');
const path = require('path');

dotenv.config();

const { DB_NAME_TEST, DB_USER, DB_PASSWORD, DB_HOST, NODE_ENV } = process.env;

const dbName = NODE_ENV === 'test'
    ? `${DB_NAME_TEST}_${process.env.JEST_WORKER_ID || '1'}` 
    : process.env.DB_NAME;

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
    const lockFile = path.join(__dirname, '..', 'jest.db.lock');

    while (true) {
        try {
            fs.writeFileSync(lockFile, 'locked', { flag: 'wx' });

            logger.info(`DB lock acquired by worker ${process.env.JEST_WORKER_ID || '1'}.`);
            try {
                await createDbIfNotExists();
                require('../models/associations');
                await sequelize.sync({ force: true });
                logger.info(`Database sync complete for worker ${process.env.JEST_WORKER_ID || '1'}.`);
            } finally {
                fs.unlinkSync(lockFile);
            }
            return;

        } catch (err) {
            if (err.code === 'EEXIST') {
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                throw err;
            }
        }
    }
};

let dbSetupCompleted = false;

const connectToDatabase = async () => {
    if (NODE_ENV !== 'test') {
        await sequelize.authenticate();
        return;
    }

    try {
        if (!dbSetupCompleted) {
            await setupTestDatabase();
            dbSetupCompleted = true;
        }
        const models = sequelize.models;
        if (models && Object.keys(models).length > 0) {
            const tableNames = Object.values(models).map(model => `"${model.tableName}"`).join(', ');
            if (tableNames) {
                await sequelize.query(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE;`);
            }
        }
    } catch (connectionError) {
        logger.error('Unable to connect to the database:', connectionError);
        throw connectionError;
    }
};

module.exports = {
    sequelize,
    connectToDatabase,
};
