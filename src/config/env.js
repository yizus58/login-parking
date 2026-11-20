'use strict';

const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');

/** Loads .env.<NODE_ENV> and then .env (existing variables always win). */
function loadEnvFiles(nodeEnv = process.env.NODE_ENV || 'development') {
    dotenv.config({ path: path.join(ROOT, `.env.${nodeEnv}`), quiet: true });
    dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
}

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

/** "true", "1" and "yes" are true; empty means the default. */
function flag(value, defaultValue) {
    const normalized = text(value).toLowerCase();
    if (!normalized) return defaultValue;
    return ['true', '1', 'yes'].includes(normalized);
}

function integer(name, value, defaultValue) {
    const raw = text(value);
    if (!raw) return defaultValue;
    if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a whole number`);
    return Number(raw);
}

/**
 * Reads and validates the configuration once. Missing settings fail at startup with the
 * variable names (never the values).
 */
function buildConfig(env = process.env) {
    const nodeEnv = text(env.NODE_ENV) || 'development';
    const isProduction = nodeEnv === 'production';
    const databaseUrl = text(env.DATABASE_URL);

    const required = ['JWT_KEY'];
    if (!databaseUrl) required.push('DB_NAME', 'DB_USER', 'DB_PASSWORD');
    const missing = required.filter((key) => !text(env[key]));
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')} (see .env.example)`);
    }
    if (text(env.JWT_KEY).length < 32) {
        throw new Error('JWT_KEY must be at least 32 characters long');
    }

    const mailTransport = (text(env.MAIL_TRANSPORT) || 'rabbitmq').toLowerCase();
    if (!['rabbitmq', 'http'].includes(mailTransport)) {
        throw new Error('MAIL_TRANSPORT must be "rabbitmq" or "http"');
    }

    const timeZone = text(env.APP_TIMEZONE) || 'America/Bogota';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
    } catch {
        throw new Error('APP_TIMEZONE must be an IANA time zone such as America/Bogota');
    }

    return {
        nodeEnv,
        isProduction,
        isTest: nodeEnv === 'test',
        port: integer('PORT', env.PORT, 3000),
        timeZone,
        corsOrigins: text(env.CORS_ORIGINS)
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        db: {
            url: databaseUrl || null,
            ssl: flag(env.DB_SSL, Boolean(databaseUrl)),
            host: text(env.DB_HOST) || 'localhost',
            port: integer('DB_PORT', env.DB_PORT, 5432),
            name: text(env.DB_NAME),
            user: text(env.DB_USER),
            password: text(env.DB_PASSWORD),
            migrate: flag(env.DB_MIGRATE, true),
            createIfMissing: flag(env.DB_CREATE_IF_MISSING, !isProduction && !databaseUrl),
            logging: flag(env.DB_LOGGING, false),
        },
        auth: {
            jwtKey: text(env.JWT_KEY),
            jwtExpiresIn: text(env.JWT_EXPIRES_IN) || '6h',
            bcryptRounds: integer('BCRYPT_ROUNDS', env.BCRYPT_ROUNDS, 10),
        },
        admin: {
            email: text(env.ADMIN_EMAIL).toLowerCase(),
            password: text(env.ADMIN_PASSWORD),
            username: text(env.ADMIN_USERNAME) || 'admin',
        },
        mail: {
            transport: mailTransport,
            apiUrl: text(env.MAIL_API_URL || env.MICROSERVICE_URL).replace(/\/+$/, ''),
            apiKey: text(env.MAIL_API_KEY),
            timeoutMs: integer('MAIL_API_TIMEOUT_MS', env.MAIL_API_TIMEOUT_MS, 10000),
            subject: text(env.APP_SUBJECT) || 'Reporte diario de parqueaderos',
        },
        rabbitmq: {
            url: text(env.RABBITMQ_URL) || 'amqp://localhost',
            queue: text(env.QUEUE_NAME) || 'email_queue',
            publishRetries: integer('RABBITMQ_PUBLISH_RETRIES', env.RABBITMQ_PUBLISH_RETRIES, 5),
            retryDelayMs: integer('RABBITMQ_RETRY_DELAY_MS', env.RABBITMQ_RETRY_DELAY_MS, 1000),
        },
        storage: {
            accountId: text(env.R2_ACCOUNT_ID),
            accessKeyId: text(env.R2_BUCKET_ACCESS_KEY),
            secretAccessKey: text(env.R2_BUCKET_SECRET_KEY),
            bucket: text(env.R2_BUCKET_NAME),
            region: text(env.R2_BUCKET_REGION) || 'auto',
        },
        reports: {
            enabled: flag(env.REPORTS_ENABLED, nodeEnv !== 'test'),
            cron: text(env.REPORTS_CRON) || '0 5 0 * * *',
        },
    };
}

let cached = null;

/** The validated configuration of this process. */
function getConfig() {
    if (!cached) {
        loadEnvFiles();
        cached = buildConfig(process.env);
    }
    return cached;
}

/** Tests only: forget the cached configuration. */
function resetConfig() {
    cached = null;
}

module.exports = { buildConfig, getConfig, resetConfig, flag, loadEnvFiles };
