'use strict';

const { resetDatabase, closeAll, createUser, api, TEST_PASSWORD } = require('../support/db');
const { signToken } = require('../../src/services/token.service');
const { getModels } = require('../../src/models');

let socio;

beforeAll(async () => {
    await resetDatabase();
    socio = await createUser({ email: 'Socio.Login@example.com' });
});
afterAll(closeAll);

describe('POST /api/auth/login', () => {
    it('returns a token and the user without the password', async () => {
        const res = await api().post('/api/auth/login').send({ email: 'socio.login@example.com', password: TEST_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.result).toBe(true);
        expect(res.body.token).toEqual(expect.any(String));
        expect(res.body.data).toEqual({ id: socio.user.id, username: socio.user.username, email: 'Socio.Login@example.com', role: 'SOCIO' });
        expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('accepts the email in any case and with spaces', async () => {
        const res = await api().post('/api/auth/login').send({ email: '  SOCIO.LOGIN@EXAMPLE.COM ', password: TEST_PASSWORD });
        expect(res.status).toBe(200);
    });

    it('answers the same 401 for a wrong password and an unknown email', async () => {
        const wrong = await api().post('/api/auth/login').send({ email: 'socio.login@example.com', password: 'nope-nope' });
        const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'nope-nope' });
        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(wrong.body).toEqual(unknown.body);
        expect(wrong.body).toEqual({ result: false, msg: 'Credenciales inválidas' });
    });

    it('validates the body', async () => {
        const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
        expect(res.status).toBe(400);
        expect(res.body.result).toBe(false);
        expect(res.body.errors.map((e) => e.field)).toEqual(['email', 'password']);
    });

    it('rejects malformed JSON with 400', async () => {
        const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
        expect(res.status).toBe(400);
        expect(res.body.msg).toMatch(/JSON/);
    });
});

describe('GET /api/auth/renew', () => {
    it('renews the token of the authenticated user', async () => {
        const res = await api(socio.token).get('/api/auth/renew');
        expect(res.status).toBe(200);
        expect(res.body.token).toEqual(expect.any(String));
        expect(res.body.data.id).toBe(socio.user.id);
    });

    it('accepts the bare token without "Bearer"', async () => {
        const res = await api().get('/api/auth/renew').set('Authorization', socio.token);
        expect(res.status).toBe(200);
    });

    it('requires a token', async () => {
        const res = await api().get('/api/auth/renew');
        expect(res.status).toBe(401);
        expect(res.body.msg).toBe('No hay token en la peticion');
    });

    it('rejects an invalid token', async () => {
        const res = await api('abc.def.ghi').get('/api/auth/renew');
        expect(res.status).toBe(401);
        expect(res.body.msg).toBe('Token no valido');
    });

    it('rejects the token of a deleted user with 401 (it crashed before)', async () => {
        const gone = await createUser();
        const token = signToken(gone.user.id);
        await getModels().User.destroy({ where: { id: gone.user.id } });
        const res = await api(token).get('/api/auth/renew');
        expect(res.status).toBe(401);
    });
});

describe('application', () => {
    it('answers the health check', async () => {
        const res = await api().get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ result: true, status: 'ok' });
    });

    it('answers 404 JSON for unknown routes', async () => {
        const res = await api().get('/api/nothing');
        expect(res.status).toBe(404);
        expect(res.body.result).toBe(false);
    });

    it('no longer serves public/index.html', async () => {
        const res = await api().get('/index.html');
        expect(res.status).toBe(404);
    });
});
