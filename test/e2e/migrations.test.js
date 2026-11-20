'use strict';

const { ensureDatabaseExists, getSequelize } = require('../../src/config/database');
const { createMigrator } = require('../../src/database/migrator');
const { closeAll } = require('../support/db');

// The schema sequelize.sync() created before migrations existed (as found in a real database).
const LEGACY_SCHEMA = `
    CREATE TYPE enum_vehicles_status AS ENUM ('IN', 'OUT');
    CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE, role VARCHAR(255) NOT NULL DEFAULT 'SOCIO');
    CREATE TABLE parkings (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, address VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL, cost_per_hour DOUBLE PRECISION NOT NULL,
        id_partner INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE);
    CREATE TABLE vehicles (id SERIAL PRIMARY KEY, plate_number VARCHAR(255) NOT NULL, model_vehicle VARCHAR(255) NOT NULL,
        entry_time TIMESTAMPTZ NOT NULL, exit_time TIMESTAMPTZ,
        id_parking INTEGER NOT NULL REFERENCES parkings(id) ON DELETE CASCADE ON UPDATE CASCADE,
        id_admin INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
        cost_per_hour DOUBLE PRECISION NOT NULL, status enum_vehicles_status NOT NULL DEFAULT 'IN');
    INSERT INTO users (username, password, email, role) VALUES ('legacy_admin', 'x', 'admin@example.com', 'ADMIN'), ('legacy_socio', 'x', 'socio@example.com', 'SOCIO');
    INSERT INTO parkings (name, address, capacity, cost_per_hour, id_partner) VALUES ('Legacy', 'Calle 1', 2, 1000, 2);
    INSERT INTO vehicles (plate_number, model_vehicle, entry_time, exit_time, id_parking, id_admin, cost_per_hour, status)
        VALUES ('LEG-001', 'x', now() - interval '2 hours', now(), 1, 2, 1000, 'OUT'), ('LEG-002', 'x', now(), NULL, 1, 2, 1000, 'IN');
`;

let sequelize;
const query = (sql) => sequelize.query(sql, { type: 'SELECT' });

async function emptySchema() {
    await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
}

const fkActions = () =>
    query(`SELECT conname, confdeltype FROM pg_constraint WHERE contype = 'f' ORDER BY conname`).then((rows) =>
        Object.fromEntries(rows.map((r) => [r.conname, r.confdeltype])),
    );

beforeAll(async () => {
    await ensureDatabaseExists();
    sequelize = getSequelize();
});
afterAll(closeAll);

describe('migrations', () => {
    it('create the full schema on an empty database and record it in SequelizeMeta', async () => {
        await emptySchema();
        const applied = await createMigrator(sequelize).up();
        expect(applied.map((m) => m.name)).toEqual(['20260101000000-baseline', '20260101000100-integrity-and-indexes']);
        const meta = await query('SELECT name FROM "SequelizeMeta" ORDER BY name');
        expect(meta.map((r) => r.name)).toHaveLength(2);
        // r = restrict, c = cascade
        expect(await fkActions()).toEqual({ parkings_id_partner_fkey: 'r', vehicles_id_admin_fkey: 'r', vehicles_id_parking_fkey: 'c' });
        const indexes = await query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`);
        expect(indexes.map((i) => i.indexname)).toEqual(expect.arrayContaining(['vehicles_one_open_stay_per_plate', 'vehicles_exit_time_idx', 'parkings_id_partner_idx']));
        expect(await createMigrator(sequelize).pending()).toEqual([]);
    });

    it('adopt a legacy database created by sync() without losing data', async () => {
        await emptySchema();
        await sequelize.query(LEGACY_SCHEMA);
        await createMigrator(sequelize).up();
        expect((await query('SELECT count(*)::int AS n FROM vehicles'))[0].n).toBe(2);
        expect(await fkActions()).toEqual({ parkings_id_partner_fkey: 'r', vehicles_id_admin_fkey: 'r', vehicles_id_parking_fkey: 'c' });
        // Deleting a partner with parkings is now refused instead of cascading.
        await expect(sequelize.query('DELETE FROM users WHERE id = 2')).rejects.toThrow(/foreign key/);
        // A second open stay of the same plate is refused by the database.
        await expect(
            sequelize.query(`INSERT INTO vehicles (plate_number, model_vehicle, entry_time, id_parking, id_admin, cost_per_hour, status)
                             VALUES ('LEG-002', 'x', now(), 1, 2, 1000, 'IN')`),
        ).rejects.toHaveProperty('parent.constraint', 'vehicles_one_open_stay_per_plate');
        await expect(sequelize.query(`INSERT INTO users (username, password, email, role) VALUES ('r', 'x', 'r@example.com', 'ROOT')`)).rejects.toHaveProperty('parent.constraint', 'users_role_valid');
        await expect(sequelize.query(`INSERT INTO parkings (name, address, capacity, cost_per_hour, id_partner) VALUES ('z', 'z', 0, 1, 2)`)).rejects.toHaveProperty('parent.constraint', 'parkings_capacity_positive');
    });

    it('stop with a clear message when a plate is inside twice', async () => {
        await emptySchema();
        await sequelize.query(LEGACY_SCHEMA);
        await sequelize.query(`INSERT INTO vehicles (plate_number, model_vehicle, entry_time, id_parking, id_admin, cost_per_hour, status)
                               VALUES ('LEG-002', 'x', now(), 1, 2, 1000, 'IN')`);
        await expect(createMigrator(sequelize).up()).rejects.toThrow(/registered as inside/);
    });

    it('can be reverted step by step', async () => {
        await emptySchema();
        const migrator = createMigrator(sequelize);
        await migrator.up();
        await migrator.down();
        expect(await fkActions()).toEqual({ parkings_id_partner_fkey: 'c', vehicles_id_admin_fkey: 'a', vehicles_id_parking_fkey: 'c' });
        await migrator.down();
        expect(await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'SequelizeMeta'`)).toEqual([]);
        await migrator.up();
        expect(await migrator.pending()).toEqual([]);
    });
});
