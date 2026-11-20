'use strict';

const { buildConfig, flag, getConfig, resetConfig } = require('../../src/config/env');

const base = { JWT_KEY: 'k'.repeat(32), DB_NAME: 'db', DB_USER: 'u', DB_PASSWORD: 'p' };

describe('configuration', () => {
    afterEach(resetConfig);

    it('applies the defaults', () => {
        const config = buildConfig(base);
        expect(config).toMatchObject({
            nodeEnv: 'development',
            port: 3000,
            timeZone: 'America/Bogota',
            corsOrigins: [],
            db: { host: 'localhost', port: 5432, migrate: true, createIfMissing: true, ssl: false, url: null },
            auth: { jwtExpiresIn: '6h', bcryptRounds: 10 },
            mail: { transport: 'rabbitmq', apiUrl: '', subject: 'Reporte diario de parqueaderos' },
            rabbitmq: { queue: 'email_queue', publishRetries: 5 },
            reports: { enabled: true, cron: '0 5 0 * * *' },
        });
    });

    it('reports every missing variable by name, never by value', () => {
        expect(() => buildConfig({})).toThrow('Missing required environment variables: JWT_KEY, DB_NAME, DB_USER, DB_PASSWORD');
        expect(() => buildConfig({ ...base, JWT_KEY: 'short' })).toThrow('JWT_KEY must be at least 32 characters long');
    });

    it('only needs DATABASE_URL (with SSL) instead of the DB_* variables', () => {
        const config = buildConfig({ JWT_KEY: base.JWT_KEY, DATABASE_URL: 'postgres://host/db', NODE_ENV: 'production' });
        expect(config.db).toMatchObject({ url: 'postgres://host/db', ssl: true, createIfMissing: false });
        expect(config.isProduction).toBe(true);
    });

    it('reads DB_PORT (it was ignored before) and the other settings', () => {
        const config = buildConfig({
            ...base,
            DB_PORT: '55433',
            CORS_ORIGINS: 'https://a.example, https://b.example',
            MAIL_TRANSPORT: 'HTTP',
            MICROSERVICE_URL: 'https://mail.example/',
            MAIL_API_KEY: 'key',
            REPORTS_ENABLED: 'no',
        });
        expect(config.db.port).toBe(55433);
        expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
        expect(config.mail).toMatchObject({ transport: 'http', apiUrl: 'https://mail.example', apiKey: 'key' });
        expect(config.reports.enabled).toBe(false);
    });

    it('rejects invalid values', () => {
        expect(() => buildConfig({ ...base, MAIL_TRANSPORT: 'smtp' })).toThrow(/MAIL_TRANSPORT/);
        expect(() => buildConfig({ ...base, PORT: 'abc' })).toThrow('PORT must be a whole number');
        expect(() => buildConfig({ ...base, APP_TIMEZONE: 'Mars/Base' })).toThrow(/APP_TIMEZONE/);
    });

    it('disables the report job in tests by default', () => {
        expect(buildConfig({ ...base, NODE_ENV: 'test' }).reports.enabled).toBe(false);
    });

    it('parses flags', () => {
        expect(flag('TRUE', false)).toBe(true);
        expect(flag('1', false)).toBe(true);
        expect(flag('0', true)).toBe(false);
        expect(flag('', true)).toBe(true);
        expect(flag(undefined, false)).toBe(false);
    });

    it('caches the process configuration', () => {
        expect(getConfig()).toBe(getConfig());
    });
});
