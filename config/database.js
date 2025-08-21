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

let migrationsExecuted = false;
let migrationPromise = null;

const createDbIfNotExists = async () => {
    const client = new pg.Client({
        user: dbUser,
        password: dbPassword,
        host: dbHost,
        database: 'postgres',
    });

    try {
        await client.connect();

        const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );

        if (result.rows.length === 0) {
            await client.query(`CREATE DATABASE "${dbName}"`);
        }
    } catch (error) {
        if (error.code !== '42P04') {
            logger.error(`Error creating database: ${error.message}`);
        }
    } finally {
        await client.end();
    }
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

const checkTablesExist = async (client) => {
    const tablesExist = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'parkings', 'vehicles')
    `);
    return tablesExist.rows.length === 3;
};

const dropExistingTables = async (client) => {
    try {
        await client.query('DROP TABLE IF EXISTS vehicles CASCADE');
        await client.query('DROP TABLE IF EXISTS parkings CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        await client.query('DROP TYPE IF EXISTS enum_vehicles_status CASCADE');
    } catch (dropError) {
        logger.error('Tables did not exist, continuing...', dropError);
    }
};

const parseMigrationFile = (migrationPath) => {
    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const cleanSQL = migrationSQL
        .replace(/--.*$/gm, '')
        .replace(/\s+/g, ' ')
        .trim();

    const rawCommands = cleanSQL.split(';').filter(cmd => cmd.trim().length > 0);
    const commands = rawCommands.map(cmd => cmd.trim() + ';');

    return {
        createTypeCommands: commands.filter(cmd => cmd.toUpperCase().includes('CREATE TYPE')),
        createTableCommands: commands.filter(cmd => cmd.toUpperCase().includes('CREATE TABLE')),
        insertCommands: commands.filter(cmd => cmd.toUpperCase().includes('INSERT INTO'))
    };
};

const executeCreateTypes = async (client, createTypeCommands) => {
    for (let i = 0; i < createTypeCommands.length; i++) {
        const command = createTypeCommands[i];
        try {
            await client.query(command);
        } catch (typeError) {
            if (typeError.code === '42710') {
                continue;
            }
            logger.error(`✗ Error in CREATE TYPE command ${i + 1}:`, typeError.message);
            throw typeError;
        }
    }
};

const executeCreateTables = async (client, createTableCommands) => {
    const tableOrder = ['users', 'parkings', 'vehicles'];

    for (const tableName of tableOrder) {
        const tableCommand = createTableCommands.find(cmd =>
            cmd.toUpperCase().includes(`CREATE TABLE PUBLIC.${tableName.toUpperCase()}`)
        );

        if (tableCommand) {
            try {
                await client.query(tableCommand);
            } catch (tableError) {
                if (tableError.code === '42P07') {
                    continue;
                }
                logger.error(`✗ Error creating table ${tableName}:`, tableError.message);
                throw tableError;
            }
        } else {
            console.warn(`⚠ CREATE TABLE command for ${tableName} not found`);
        }
    }
};

const executeInserts = async (client, insertCommands) => {
    const tableOrder = ['users', 'parkings', 'vehicles'];

    for (const tableName of tableOrder) {
        const insertCommand = insertCommands.find(cmd =>
            cmd.toUpperCase().includes(`INSERT INTO PUBLIC.${tableName.toUpperCase()}`)
        );

        if (insertCommand) {
            try {
                const existingData = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
                if (parseInt(existingData.rows[0].count) > 0) {
                    continue;
                }
                await client.query(insertCommand);
            } catch (insertError) {
                logger.error(`✗ Error inserting into ${tableName}:`, insertError.message);
            }
        } else {
            console.warn(`⚠ INSERT command for ${tableName} not found`);
        }
    }
};

const runMigrations = async () => {

    if (migrationsExecuted) {
        return;
    }

    if (migrationPromise) {
        return migrationPromise;
    }

    if (NODE_ENV !== 'test') {
        migrationsExecuted = true;
        return;
    }

    migrationPromise = (async () => {
        const client = new pg.Client({
            user: dbUser,
            password: dbPassword,
            host: dbHost,
            database: dbName,
        });

        try {
            await client.connect();

            if (await checkTablesExist(client)) {
                migrationsExecuted = true;
                return;
            }

            await dropExistingTables(client);

            const migrationPath = path.join(__dirname, '..', 'migrations', 'database.sql');
            const { createTypeCommands, createTableCommands, insertCommands } = parseMigrationFile(migrationPath);

            await executeCreateTypes(client, createTypeCommands);
            await executeCreateTables(client, createTableCommands);
            await executeInserts(client, insertCommands);

            migrationsExecuted = true;

        } catch (migrationError) {
            logger.error('Error running migrations:', migrationError);
            throw migrationError;
        } finally {
            await client.end();
        }
    })();

    return migrationPromise;
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

const showAllDatabases = async () => {
    try {
        await sequelize.query('SELECT datname FROM pg_database WHERE datistemplate = false', { type: sequelize.QueryTypes.SELECT });
    } catch (dbListError) {
        logger.error('Error fetching databases:', dbListError);
    }
};

const resetMigrationState = () => {
    migrationsExecuted = false;
    migrationPromise = null;
};

module.exports = {
    sequelize,
    connectToDatabase,
    showAllDatabases,
    runMigrations,
    resetMigrationState
};