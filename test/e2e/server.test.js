'use strict';

const http = require('http');
const { resetConfig } = require('../../src/config/env');
const { getModels } = require('../../src/models');
const { getSequelize } = require('../../src/config/database');
const { closeAll } = require('../support/db');

const get = (port, path) =>
    new Promise((resolve, reject) => {
        http.get({ port, path }, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        }).on('error', reject);
    });

let server;

beforeAll(async () => {
    await getSequelize().query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;').catch(async () => {
        await require('../../src/config/database').ensureDatabaseExists();
    });
    process.env.PORT = '0';
    process.env.ADMIN_EMAIL = 'Admin.Seed@example.com';
    process.env.ADMIN_PASSWORD = 'Seed-password-1';
    resetConfig();
});
afterAll(async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.PORT;
    resetConfig();
    await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
    await closeAll();
});

describe('server start', () => {
    it('migrates, seeds the admin once and listens', async () => {
        const { start } = require('../../src/server');
        server = await start();
        await new Promise((resolve) => (server.listening ? resolve() : server.once('listening', resolve)));
        const res = await get(server.address().port, '/health');
        expect(res).toEqual({ status: 200, body: { result: true, status: 'ok' } });

        const admins = await getModels().User.findAll({ where: { role: 'ADMIN' } });
        expect(admins.map((u) => u.email)).toEqual(['admin.seed@example.com']);

        const { seedAdmin } = require('../../src/services/user.service');
        expect(await seedAdmin()).toBe(false);
        expect(await getModels().User.count()).toBe(1);
    });
});
