'use strict';

const bcrypt = require('bcryptjs');
const { resetDatabase, closeAll, createUser, createParking, api } = require('../support/db');
const { getModels } = require('../../src/models');

let admin;
let socio;

beforeAll(async () => {
    await resetDatabase();
    admin = await createUser({ role: 'ADMIN' });
    socio = await createUser();
});
afterAll(closeAll);

const newUser = (overrides = {}) => ({ username: `new_${Date.now()}`, email: `new${Date.now()}@example.com`, password: 'Password-123', ...overrides });

describe('POST /api/users', () => {
    it('creates a partner (default role SOCIO) and stores a bcrypt hash', async () => {
        const body = newUser();
        const res = await api(admin.token).post('/api/users').send(body);
        expect(res.status).toBe(201);
        expect(res.body.data).toEqual({ id: expect.any(Number), username: body.username, email: body.email, role: 'SOCIO' });
        const stored = await getModels().User.scope('withPassword').findByPk(res.body.data.id);
        expect(await bcrypt.compare('Password-123', stored.password)).toBe(true);
    });

    it('creates an admin when asked', async () => {
        const res = await api(admin.token).post('/api/users').send(newUser({ username: 'other_admin', email: 'other.admin@example.com', role: 'ADMIN' }));
        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('ADMIN');
    });

    it('ignores fields outside the whitelist (no mass assignment)', async () => {
        const res = await api(admin.token).post('/api/users').send(newUser({ username: 'mass_assign', email: 'mass@example.com', id: 9999 }));
        expect(res.status).toBe(201);
        expect(res.body.data.id).not.toBe(9999);
    });

    it('answers 409 for a duplicate email or username, case-insensitive', async () => {
        const email = await api(admin.token).post('/api/users').send(newUser({ email: socio.user.email.toUpperCase() }));
        expect(email.status).toBe(409);
        expect(email.body.msg).toMatch(/correo/);
        const username = await api(admin.token).post('/api/users').send(newUser({ username: socio.user.username.toUpperCase() }));
        expect(username.status).toBe(409);
        expect(username.body.msg).toMatch(/usuario/);
    });

    it('validates email, password length and role', async () => {
        const res = await api(admin.token).post('/api/users').send({ username: 'x', email: 'bad', password: 'short', role: 'ROOT' });
        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['email', 'password', 'role']);
    });

    it('is only for admins', async () => {
        expect((await api(socio.token).post('/api/users').send(newUser())).status).toBe(403);
        expect((await api().post('/api/users').send(newUser())).status).toBe(401);
    });
});

describe('GET /api/users', () => {
    it('lists the partners without passwords', async () => {
        const res = await api(admin.token).get('/api/users');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((u) => u.role === 'SOCIO' && u.password === undefined)).toBe(true);
    });

    it('is only for admins', async () => {
        const res = await api(socio.token).get('/api/users');
        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('Solo los administradores pueden realizar esta acción');
    });
});

describe('PUT /api/users/:id', () => {
    it('updates username and email and keeps the password when it is not sent', async () => {
        const target = await createUser();
        const res = await api(admin.token).put(`/api/users/${target.user.id}`).send({ username: 'renamed_user', email: 'renamed@example.com' });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ username: 'renamed_user', email: 'renamed@example.com', role: 'SOCIO' });
        const login = await api().post('/api/auth/login').send({ email: 'renamed@example.com', password: target.password });
        expect(login.status).toBe(200);
    });

    it('changes the password when sent', async () => {
        const target = await createUser();
        await api(admin.token)
            .put(`/api/users/${target.user.id}`)
            .send({ username: target.user.username, email: target.user.email, password: 'Another-pass-9' });
        const login = await api().post('/api/auth/login').send({ email: target.user.email, password: 'Another-pass-9' });
        expect(login.status).toBe(200);
    });

    it('answers 404 for an unknown user', async () => {
        const res = await api(admin.token).put('/api/users/999999').send({ username: 'nobody', email: 'nobody@example.com' });
        expect(res.status).toBe(404);
    });

    it('answers 409 when the email belongs to someone else (it was a 500)', async () => {
        const target = await createUser();
        const res = await api(admin.token).put(`/api/users/${target.user.id}`).send({ username: target.user.username, email: socio.user.email });
        expect(res.status).toBe(409);
    });

    it('does not let an admin change their own role', async () => {
        const res = await api(admin.token).put(`/api/users/${admin.user.id}`).send({ username: admin.user.username, email: admin.user.email, role: 'SOCIO' });
        expect(res.status).toBe(409);
        expect(res.body.msg).toBe('No puede cambiar su propio rol');
    });

    it('does not turn into ADMIN a partner that owns parkings', async () => {
        const owner = await createUser();
        await createParking(owner.user.id);
        const res = await api(admin.token).put(`/api/users/${owner.user.id}`).send({ username: owner.user.username, email: owner.user.email, role: 'ADMIN' });
        expect(res.status).toBe(409);
    });

    it('validates the id', async () => {
        const res = await api(admin.token).put('/api/users/abc').send({ username: 'a', email: 'a@example.com' });
        expect(res.status).toBe(400);
    });

    it('is only for admins', async () => {
        const res = await api(socio.token).put(`/api/users/${socio.user.id}`).send({ username: 'me', email: 'me@example.com', role: 'ADMIN' });
        expect(res.status).toBe(403);
    });
});
