'use strict';

const express = require('express');
const request = require('supertest');
const { body } = require('express-validator');
const { errorHandler, notFoundHandler, GENERIC_MESSAGE } = require('../../src/middlewares/error-handler');
const { authorize } = require('../../src/middlewares/authorize');
const { validate } = require('../../src/middlewares/validate');
const { conflict } = require('../../src/utils/errors');

function appWith(handler, ...middlewares) {
    const app = express();
    app.use(express.json());
    app.post('/t', ...middlewares, handler);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

const throwing = (error) => async () => {
    throw error;
};

describe('error handler', () => {
    it('answers AppErrors with their status and message', async () => {
        const res = await request(appWith(throwing(conflict('Ocupado')))).post('/t');
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ result: false, msg: 'Ocupado' });
    });

    it('maps database constraint errors to 409', async () => {
        const unique = Object.assign(new Error('dup'), { name: 'SequelizeUniqueConstraintError' });
        const fk = Object.assign(new Error('fk'), { name: 'SequelizeForeignKeyConstraintError' });
        expect((await request(appWith(throwing(unique))).post('/t')).status).toBe(409);
        expect((await request(appWith(throwing(fk))).post('/t')).status).toBe(409);
    });

    it('hides unexpected errors behind a generic 500', async () => {
        const res = await request(appWith(throwing(new Error('SELECT secret FROM x')))).post('/t');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ result: false, msg: GENERIC_MESSAGE });
    });

    it('answers 400 for malformed JSON and 413 for a large body', async () => {
        const app = appWith((_req, res) => res.json({}));
        expect((await request(app).post('/t').set('Content-Type', 'application/json').send('{')).status).toBe(400);
        const big = JSON.stringify({ a: 'x'.repeat(200 * 1024) });
        expect((await request(app).post('/t').set('Content-Type', 'application/json').send(big)).status).toBe(413);
    });

    it('answers 404 for unknown routes', async () => {
        const res = await request(appWith((_req, res) => res.json({}))).get('/nope');
        expect(res.status).toBe(404);
        expect(res.body.result).toBe(false);
    });
});

describe('authorize', () => {
    const withUser = (role) => (req, _res, next) => {
        req.user = role ? { id: 1, role } : undefined;
        next();
    };
    const ok = (_req, res) => res.json({ ok: true });

    it('lets the allowed roles through', async () => {
        expect((await request(appWith(ok, withUser('ADMIN'), authorize('ADMIN'))).post('/t')).status).toBe(200);
        expect((await request(appWith(ok, withUser('SOCIO'), authorize('ADMIN', 'SOCIO'))).post('/t')).status).toBe(200);
    });

    it('refuses other roles, unknown roles and missing users with 403 (unknown roles got 500 before)', async () => {
        const res = await request(appWith(ok, withUser('SOCIO'), authorize('ADMIN'))).post('/t');
        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('Solo los administradores pueden realizar esta acción');
        expect((await request(appWith(ok, withUser('OTHER'), authorize('ADMIN', 'SOCIO'))).post('/t')).status).toBe(403);
        expect((await request(appWith(ok, withUser(null), authorize('SOCIO'))).post('/t')).body.msg).toBe('Solo los socios pueden realizar esta acción');
    });
});

describe('validate', () => {
    const echo = (req, res) => res.json(req.valid);

    it('keeps only the validated, sanitized fields in req.valid', async () => {
        const app = appWith(echo, ...validate([body('n').isInt().toInt(), body('s').trim()]));
        const res = await request(app).post('/t').send({ n: '5', s: '  x ', extra: 'no' });
        expect(res.body).toEqual({ n: 5, s: 'x' });
    });

    it('answers 400 with the first error per field', async () => {
        const app = appWith(echo, ...validate([body('n', 'n inválido').isInt(), body('m', 'm inválido').notEmpty()]));
        const res = await request(app).post('/t').send({});
        expect(res.status).toBe(400);
        expect(res.body.msg).toBe('n inválido');
        expect(res.body.errors).toEqual([
            { field: 'n', location: 'body', msg: 'n inválido' },
            { field: 'm', location: 'body', msg: 'm inválido' },
        ]);
    });
});
