'use strict';

/**
 * End-to-end tests run against a real PostgreSQL. Point them at a server with TEST_DB_HOST,
 * TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD and TEST_DB_NAME (the database is dropped and
 * re-created by the tests, so never use a real one). Values here are throwaway, not secrets.
 */
const { randomBytes } = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_KEY = randomBytes(32).toString('hex');
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'login_parking_test';
process.env.DB_SSL = 'false';
process.env.DB_MIGRATE = 'true';
process.env.DB_CREATE_IF_MISSING = 'true';
process.env.REPORTS_ENABLED = 'false';
process.env.APP_TIMEZONE = 'America/Bogota';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOG_LEVEL = 'silent';
for (const key of ['DATABASE_URL', 'MAIL_TRANSPORT', 'MAIL_API_URL', 'MICROSERVICE_URL', 'MAIL_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CORS_ORIGINS']) {
    delete process.env[key];
}

if (!/test/i.test(process.env.DB_NAME)) {
    throw new Error('TEST_DB_NAME must contain "test": the e2e tests drop and re-create that database');
}
