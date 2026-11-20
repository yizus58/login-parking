'use strict';

const request = require('supertest');
const { ensureDatabaseExists, getSequelize, closeDatabase } = require('../../src/config/database');
const { createMigrator } = require('../../src/database/migrator');
const { createApp } = require('../../src/app');
const { getModels, resetModels } = require('../../src/models');
const { hashPassword } = require('../../src/services/user.service');
const { signToken } = require('../../src/services/token.service');
const { ROLES } = require('../../src/models/roles');

let counter = 0;
const unique = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Empty schema with every migration applied. */
async function resetDatabase() {
    await ensureDatabaseExists();
    const sequelize = getSequelize();
    await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await createMigrator(sequelize).up();
    return sequelize;
}

async function closeAll() {
    await closeDatabase();
    resetModels();
}

const TEST_PASSWORD = 'Test-password-1';

async function createUser({ role = ROLES.SOCIO, username = unique('user_'), email, password = TEST_PASSWORD } = {}) {
    const user = await getModels().User.create({
        username,
        email: email ?? `${username}@example.com`,
        password: await hashPassword(password),
        role,
    });
    return { user, token: signToken(user.id), password };
}

async function createParking(partnerId, overrides = {}) {
    return getModels().Parking.create({
        name: unique('Parking '),
        address: 'Calle 1 # 2-3',
        capacity: 5,
        cost_per_hour: 2000,
        id_partner: partnerId,
        ...overrides,
    });
}

/** A finished (or open, without exit) stay inserted directly. */
async function createStay(parking, registeredBy, { plate = 'AAA-111', model = 'Mazda 3', entry, exit = null, costPerHour } = {}) {
    return getModels().Vehicle.create({
        id_parking: parking.id,
        plate_number: plate,
        model_vehicle: model,
        entry_time: entry,
        exit_time: exit,
        cost_per_hour: costPerHour ?? parking.cost_per_hour,
        id_admin: registeredBy.id,
        status: exit ? 'OUT' : 'IN',
    });
}

/** supertest agent with the bearer token set. */
function api(token) {
    const app = createApp();
    const withAuth = (req) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
    return {
        get: (url) => withAuth(request(app).get(url)),
        post: (url) => withAuth(request(app).post(url)),
        put: (url) => withAuth(request(app).put(url)),
        delete: (url) => withAuth(request(app).delete(url)),
    };
}

module.exports = { resetDatabase, closeAll, createUser, createParking, createStay, api, unique, TEST_PASSWORD };
