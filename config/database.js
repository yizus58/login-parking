const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

function createConnSequelize(dbName) {
    return new Sequelize(
        dbName,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: "postgres",
            logging: false,
            define: {
                timestamps: false,
                createdAt: false,
                updatedAt: false,
                deletedAt: false,
                charset: 'utf8',
                collate: 'utf8_general_ci',
            },
            dialectOptions: {
                useUTC: false,
            },
            timezone: '-05:00'
        }
    );
}

async function ensureDatabaseExists() {
    const tempSequelize = createConnSequelize("postgres");
    try {
        await tempSequelize.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
    } catch (err) {
        if (err.original && err.original.code !== '42P04') {
            console.error("Error al crear la base de datos:", err);
        }
    } finally {
        await tempSequelize.close();
    }
}

async function connectToDatabase() {
    try {
        await ensureDatabaseExists();
        sequelize = createConnSequelize(process.env.DB_NAME);
        await sequelize.authenticate();
    } catch (err) {
        console.error("Error de conexión", err);
    }
}

module.exports = {
    connectToDatabase,
    get sequelize() { return sequelize; }
};
