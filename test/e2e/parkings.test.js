'use strict';

const { resetDatabase, closeAll, createUser, createParking, createStay, api } = require('../support/db');
const { getModels } = require('../../src/models');

let admin;
let socio;
let otherSocio;

beforeAll(async () => {
    await resetDatabase();
    admin = await createUser({ role: 'ADMIN' });
    socio = await createUser();
    otherSocio = await createUser();
});
afterAll(closeAll);

const parkingBody = (overrides = {}) => ({ name: 'Centro', address: 'Cra 7 # 12-30', capacity: 3, cost: 2500, id_partner: socio.user.id, ...overrides });

describe('POST /api/parking', () => {
    it('creates a parking for a partner', async () => {
        const res = await api(admin.token).post('/api/parking').send(parkingBody());
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ name: 'Centro', capacity: 3, cost_per_hour: 2500, id_partner: socio.user.id });
    });

    it('rejects a partner that does not exist (404) or is not SOCIO (400)', async () => {
        expect((await api(admin.token).post('/api/parking').send(parkingBody({ id_partner: 999999 }))).status).toBe(404);
        const res = await api(admin.token).post('/api/parking').send(parkingBody({ id_partner: admin.user.id }));
        expect(res.status).toBe(400);
        expect(res.body.msg).toMatch(/no es socio/);
    });

    it('validates capacity and cost', async () => {
        const res = await api(admin.token).post('/api/parking').send(parkingBody({ capacity: 0, cost: -1 }));
        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['capacity', 'cost']);
    });

    it('is only for admins', async () => {
        expect((await api(socio.token).post('/api/parking').send(parkingBody())).status).toBe(403);
    });
});

describe('PUT /api/parking/:id', () => {
    it('updates the parking', async () => {
        const parking = await createParking(socio.user.id);
        const res = await api(admin.token).put(`/api/parking/${parking.id}`).send(parkingBody({ name: 'Renamed', capacity: 10, id_partner: otherSocio.user.id }));
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ name: 'Renamed', capacity: 10, id_partner: otherSocio.user.id });
    });

    it('accepts a capacity equal to the vehicles inside (it failed before) and rejects a lower one with 409', async () => {
        const parking = await createParking(socio.user.id, { capacity: 5 });
        await createStay(parking, socio.user, { plate: 'EQU-001', entry: new Date() });
        await createStay(parking, socio.user, { plate: 'EQU-002', entry: new Date() });
        expect((await api(admin.token).put(`/api/parking/${parking.id}`).send(parkingBody({ capacity: 2 }))).status).toBe(200);
        const lower = await api(admin.token).put(`/api/parking/${parking.id}`).send(parkingBody({ capacity: 1 }));
        expect(lower.status).toBe(409);
    });

    it('checks the new partner is a SOCIO', async () => {
        const parking = await createParking(socio.user.id);
        const res = await api(admin.token).put(`/api/parking/${parking.id}`).send(parkingBody({ id_partner: admin.user.id }));
        expect(res.status).toBe(400);
    });

    it('answers 404 for an unknown parking', async () => {
        expect((await api(admin.token).put('/api/parking/999999').send(parkingBody())).status).toBe(404);
    });

    it('is only for admins', async () => {
        const parking = await createParking(socio.user.id);
        expect((await api(socio.token).put(`/api/parking/${parking.id}`).send(parkingBody())).status).toBe(403);
    });
});

describe('GET /api/parking', () => {
    it('gives an admin every parking with partner and vehicles', async () => {
        const res = await api(admin.token).get('/api/parking');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(1);
        expect(res.body.data[0]).toHaveProperty('partner');
        expect(res.body.data[0]).toHaveProperty('vehicles');
    });

    it('gives a partner only its own parkings', async () => {
        const mine = await createParking(otherSocio.user.id);
        const res = await api(otherSocio.token).get('/api/parking');
        expect(res.status).toBe(200);
        expect(res.body.data.map((p) => p.id)).toContain(mine.id);
        const owners = await getModels().Parking.findAll({ where: { id: res.body.data.map((p) => p.id) } });
        expect(owners.every((p) => p.id_partner === otherSocio.user.id)).toBe(true);
    });
});

describe('GET /api/parking/:id', () => {
    it('returns one parking (object, not array) to an admin', async () => {
        const parking = await createParking(socio.user.id);
        const res = await api(admin.token).get(`/api/parking/${parking.id}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ id: parking.id, partner: { id: socio.user.id } });
    });

    it('answers 404 for an unknown parking (it returned [] before)', async () => {
        expect((await api(admin.token).get('/api/parking/999999')).status).toBe(404);
    });

    it('returns the requested parking to its partner and 403 for another partner', async () => {
        const parking = await createParking(socio.user.id);
        expect((await api(socio.token).get(`/api/parking/${parking.id}`)).body.data.id).toBe(parking.id);
        const res = await api(otherSocio.token).get(`/api/parking/${parking.id}`);
        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('El parqueadero no le pertenece');
    });
});

describe('DELETE /api/parking/:id', () => {
    it('refuses while vehicles are inside (409)', async () => {
        const parking = await createParking(socio.user.id);
        await createStay(parking, socio.user, { plate: 'DEL-001', entry: new Date() });
        const res = await api(admin.token).delete(`/api/parking/${parking.id}`);
        expect(res.status).toBe(409);
    });

    it('deletes an empty parking together with its history', async () => {
        const parking = await createParking(socio.user.id);
        await createStay(parking, socio.user, { plate: 'DEL-002', entry: new Date(Date.now() - 3600e3), exit: new Date() });
        const res = await api(admin.token).delete(`/api/parking/${parking.id}`);
        expect(res.status).toBe(200);
        expect(await getModels().Parking.findByPk(parking.id)).toBeNull();
        expect(await getModels().Vehicle.count({ where: { id_parking: parking.id } })).toBe(0);
    });

    it('answers 404 for an unknown parking and 403 for a partner', async () => {
        expect((await api(admin.token).delete('/api/parking/999999')).status).toBe(404);
        const parking = await createParking(socio.user.id);
        expect((await api(socio.token).delete(`/api/parking/${parking.id}`)).status).toBe(403);
    });
});
