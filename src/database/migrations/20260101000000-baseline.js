'use strict';

/**
 * Baseline: the schema the application used to create with sequelize.sync() (and
 * migrations/database.sql). Every statement is IF NOT EXISTS, so existing databases are
 * adopted unchanged and new ones get the same schema.
 */
module.exports = {
    name: '20260101000000-baseline',
    async up({ context: queryInterface }) {
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_vehicles_status AS ENUM ('IN', 'OUT');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL CONSTRAINT users_username_key UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL CONSTRAINT users_email_key UNIQUE,
                role VARCHAR(255) NOT NULL DEFAULT 'SOCIO'
            );

            CREATE TABLE IF NOT EXISTS parkings (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255) NOT NULL,
                capacity INTEGER NOT NULL,
                cost_per_hour DOUBLE PRECISION NOT NULL,
                id_partner INTEGER NOT NULL
                    CONSTRAINT parkings_id_partner_fkey REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS vehicles (
                id SERIAL PRIMARY KEY,
                plate_number VARCHAR(255) NOT NULL,
                model_vehicle VARCHAR(255) NOT NULL,
                entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
                exit_time TIMESTAMP WITH TIME ZONE,
                id_parking INTEGER NOT NULL
                    CONSTRAINT vehicles_id_parking_fkey REFERENCES parkings(id) ON UPDATE CASCADE ON DELETE CASCADE,
                id_admin INTEGER NOT NULL
                    CONSTRAINT vehicles_id_admin_fkey REFERENCES users(id) ON UPDATE CASCADE,
                cost_per_hour DOUBLE PRECISION NOT NULL,
                status enum_vehicles_status NOT NULL DEFAULT 'IN'
            );
        `);
    },
    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS vehicles;
            DROP TABLE IF EXISTS parkings;
            DROP TABLE IF EXISTS users;
            DROP TYPE IF EXISTS enum_vehicles_status;
        `);
    },
};
