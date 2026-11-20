'use strict';

// Unit tests never touch a database; these are throwaway values, not secrets.
const { randomBytes } = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_KEY = process.env.JWT_KEY_TEST || randomBytes(32).toString('hex');
process.env.DB_NAME = 'unit_tests_no_db';
process.env.DB_USER = 'unit';
process.env.DB_PASSWORD = 'unit';
process.env.DB_PORT = '1';
process.env.REPORTS_ENABLED = 'false';
process.env.APP_TIMEZONE = 'America/Bogota';
process.env.LOG_LEVEL = 'silent';
for (const key of ['DATABASE_URL', 'MAIL_TRANSPORT', 'MAIL_API_URL', 'MICROSERVICE_URL', 'MAIL_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CORS_ORIGINS']) {
    delete process.env[key];
}
