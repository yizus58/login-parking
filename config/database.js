const { Sequelize } = require('sequelize');
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const { DB_NAME, DB_NAME_TEST, DB_USER, DB_PASSWORD, DB_HOST, NODE_ENV } = process.env;

const dbName = NODE_ENV === 'test'? DB_NAME_TEST : DB_NAME;
const dbUser = DB_USER;
const dbPassword = DB_PASSWORD;
const dbHost = DB_HOST;

const createDbIfNotExists = async () => {
    const client = new pg.Client({
        user: dbUser,
        password: dbPassword,
        host: dbHost,
        database: 'postgres',
    });

    try {
        await client.connect();
        const result = await client.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
        if (result.rowCount === 0) {
            await client.query(`CREATE DATABASE ${dbName}`);
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
};

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'postgres',
    logging: NODE_ENV === 'test' ? false : console.log,
});

const connectToDatabase = async () => {
    try {
        await createDbIfNotExists();
        await sequelize.authenticate();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

module.exports = {
    connectToDatabase,
    sequelize,
};