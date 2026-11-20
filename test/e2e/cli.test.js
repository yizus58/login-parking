'use strict';

const { getSequelize, ensureDatabaseExists } = require('../../src/config/database');
const { resetConfig } = require('../../src/config/env');
const { closeAll } = require('../support/db');

describe('database CLI', () => {
    afterAll(async () => {
        delete process.env.ADMIN_EMAIL;
        delete process.env.ADMIN_PASSWORD;
        resetConfig();
        await closeAll();
    });

    it('migrates, shows the status, seeds the admin and reverts', async () => {
        await ensureDatabaseExists();
        await getSequelize().query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
        await closeAll();

        process.env.ADMIN_EMAIL = 'cli.admin@example.com';
        process.env.ADMIN_PASSWORD = 'Cli-password-1';
        resetConfig();
        const { run } = require('../../src/database/cli');
        const out = [];
        const log = (line) => out.push(line);

        await run('migrate', log);
        await run('migrate', log);
        await run('migrate:status', log);
        await run('seed:admin', log);
        await run('seed:admin', log);
        await run('migrate:down', log);
        await run('migrate:status', log);
        expect(out).toEqual([
            'Applied: 20260101000000-baseline, 20260101000100-integrity-and-indexes',
            'Nothing to apply',
            'applied  20260101000000-baseline',
            'applied  20260101000100-integrity-and-indexes',
            'Admin user created',
            'Admin user already exists (or ADMIN_EMAIL is empty)',
            'Reverted: 20260101000100-integrity-and-indexes',
            'applied  20260101000000-baseline',
            'pending  20260101000100-integrity-and-indexes',
        ]);
    });
});
