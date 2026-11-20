'use strict';

/**
 * Database commands:  node src/database/cli.js <migrate|migrate:down|migrate:status|seed:admin>
 */
const { getConfig } = require('../config/env');
const { getSequelize, ensureDatabaseExists, closeDatabase } = require('../config/database');
const { createMigrator } = require('./migrator');

const USAGE = `Usage: node src/database/cli.js <command>
  migrate         apply pending migrations
  migrate:down    revert the last migration
  migrate:status  list applied and pending migrations
  seed:admin      create the admin user from ADMIN_EMAIL / ADMIN_PASSWORD (never changes an existing one)`;

const COMMANDS = ['migrate', 'migrate:down', 'migrate:status', 'seed:admin'];

async function run(command, out = console.log) {
    const config = getConfig();
    if (config.db.createIfMissing) await ensureDatabaseExists(config.db);
    const migrator = createMigrator(getSequelize());
    try {
        if (command === 'migrate') {
            const applied = await migrator.up();
            out(applied.length ? `Applied: ${applied.map((m) => m.name).join(', ')}` : 'Nothing to apply');
        } else if (command === 'migrate:down') {
            const reverted = await migrator.down();
            out(reverted.length ? `Reverted: ${reverted[0].name}` : 'Nothing to revert');
        } else if (command === 'migrate:status') {
            for (const m of await migrator.executed()) out(`applied  ${m.name}`);
            for (const m of await migrator.pending()) out(`pending  ${m.name}`);
        } else {
            const { seedAdmin } = require('../services/user.service');
            out((await seedAdmin()) ? 'Admin user created' : 'Admin user already exists (or ADMIN_EMAIL is empty)');
        }
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    const command = process.argv[2];
    if (!COMMANDS.includes(command)) {
        console.log(USAGE);
        process.exitCode = command ? 1 : 0;
    } else {
        run(command).catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        });
    }
}

module.exports = { run };
