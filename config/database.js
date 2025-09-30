const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const pg = require('pg');
const logger = require("../utils/logger");

dotenv.config();

const { DB_NAME, DB_NAME_TEST, DB_USER, DB_PASSWORD, DB_HOST, NODE_ENV } = process.env;

const dbName = NODE_ENV === 'test' ? DB_NAME_TEST : DB_NAME;
const dbUser = DB_USER;
const dbPassword = DB_PASSWORD;
const dbHost = DB_HOST;

// Use global to share promises across Jest's parallel workers
if (typeof global.createDbPromise === 'undefined') {
    global.createDbPromise = null;
}
if (typeof global.migrationPromise === 'undefined') {
    global.migrationPromise = null;
}

const createDbIfNotExists = async () => {
    if (global.createDbPromise) {
        return global.createDbPromise;
    }

    global.createDbPromise = (async () => {
        const client = new pg.Client({
            user: dbUser,
            password: dbPassword,
            host: dbHost,
            database: 'postgres', // Connect to the default DB to create a new one
        });

        try {
            await client.connect();
            const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
            if (result.rows.length === 0) {
                await client.query(`CREATE DATABASE "${dbName}"`);
                logger.info(`Database "${dbName}" created by a test worker.`);
            }
        } catch (error) {
            if (error.code !== '42P04') { // 42P04 = duplicate_database
                logger.error(`Error creating database: ${error.message}`);
                throw error; // Rethrow if it's not a race condition we can ignore
            }
            // If it is a duplicate_database error, another worker created it, which is fine.
        } finally {
            await client.end();
        }
    })();

    return global.createDbPromise;
};

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// --- The user's existing migration helper functions ---
const dropExistingTables = async (client) => {
    try {
        await client.query('DROP TABLE IF EXISTS vehicles CASCADE');
        await client.query('DROP TABLE IF EXISTS parkings CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        await client.query('DROP TYPE IF EXISTS enum_vehicles_status CASCADE');
    } catch (dropError) {
        logger.error('Error dropping tables:', dropError);
    }
};

const parseMigrationFile = (migrationPath) => {
    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
    }
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const cleanSQL = migrationSQL.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();
    return cleanSQL.split(';').filter(cmd => cmd.trim().length > 0).map(cmd => cmd.trim() + ';');
};

const executeMigrations = async (client, commands) => {
    for (const command of commands) {
        try {
            await client.query(command);
        } catch (error) {
            // Ignore "already exists" errors to make the script idempotent
            if (error.code === '42P07' || error.code === '42710') { // duplicate_table or duplicate_object (for ENUMs)
                continue;
            } else {
                logger.error(`Migration command failed: ${command}`, error);
                throw error;
            }
        }
    }
};
// --- End of user's migration helpers ---

const runMigrations = async () => {
    if (NODE_ENV !== 'test') {
        return;
    }

    if (global.migrationPromise) {
        return global.migrationPromise;
    }

    global.migrationPromise = (async () => {
        const client = new pg.Client({ user: dbUser, password: dbPassword, host: dbHost, database: dbName });
        try {
            await client.connect();
            // Drop tables every time for a clean slate in tests
            await dropExistingTables(client);
            const migrationPath = path.join(__dirname, '..', 'migrations', 'database.sql');
            const commands = parseMigrationFile(migrationPath);
            await executeMigrations(client, commands);
            logger.info('Migrations executed successfully by a single test worker.');
        } catch (migrationError) {
            logger.error('Error running migrations:', migrationError);
            throw migrationError;
        } finally {
            await client.end();
        }
    })();

    return global.migrationPromise;
};

const connectToDatabase = async () => {
    try {
        await createDbIfNotExists();
        await runMigrations();
        await sequelize.authenticate();
    } catch (connectionError) {
        logger.error('Unable to connect to the database:', connectionError);
        throw connectionError;
    }
};

const resetMigrationState = () => {
    global.createDbPromise = null;
    global.migrationPromise = null;
};

module.exports = {
    sequelize,
    connectToDatabase,
    resetMigrationState
};