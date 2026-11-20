'use strict';

const { resetDatabase, closeAll, createUser, createParking, createStay, api } = require('../support/db');
const { getModels } = require('../../src/models');

let admin;
let socio;
let otherSocio;
let parking;

beforeAll(async () => {
    await resetDatabase();
    admin = await createUser({ role: 'ADMIN' });
    socio = await createUser();
    otherSocio = await createUser();
    parking = await createParking(socio.user.id, { capacity: 10, cost_per_hour: 3000 });
});
afterAll(closeAll);

const entry = (token, body) => api(token).post('/api/vehicles').send({ id_parking: parking.id, model_vehicle: 'Renault Logan', ...body });
const exit = (token, body) => api(token).put('/api/vehicles').send({ id_parking: parking.id, ...body });

describe('POST /api/vehicles (entry)', () => {
    it('registers the entry, normalizes the plate and returns UTC and local times', async () => {
        const res = await entry(socio.token, { vehicle_plate: 'abc 123' });
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ plate_number: 'ABC-123', status: 'IN', id_parking: parking.id, id_admin: socio.user.id, time_zone: 'America/Bogota' });
        expect(new Date(res.body.data.entry_time).toISOString()).toBe(res.body.data.entry_time);
        expect(res.body.data.entry_time_local).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/);
        expect(res.body.data.cost_per_hour).toBe(3000);
    });

    it('keeps motorcycle plates as typed (upper case)', async () => {
        const res = await entry(socio.token, { vehicle_plate: 'xyz12d' });
        expect(res.status).toBe(201);
        expect(res.body.data.plate_number).toBe('XYZ12D');
    });

    it('rejects invalid plates with 400', async () => {
        expect((await entry(socio.token, { vehicle_plate: 'AÑC123' })).body.msg).toBe('La placa no puede contener la letra ñ');
        expect((await entry(socio.token, { vehicle_plate: 'AB$123' })).status).toBe(400);
        expect((await entry(socio.token, { vehicle_plate: 'AB12' })).status).toBe(400);
    });

    it('answers 409 when the plate is already inside this or another parking', async () => {
        await entry(socio.token, { vehicle_plate: 'DUP111' });
        const same = await entry(socio.token, { vehicle_plate: 'DUP-111' });
        expect(same.status).toBe(409);
        expect(same.body.msg).toMatch(/ya se encuentra dentro/);
        const another = await createParking(socio.user.id);
        const other = await api(socio.token).post('/api/vehicles').send({ id_parking: another.id, vehicle_plate: 'DUP111', model_vehicle: 'x' });
        expect(other.status).toBe(409);
        expect(other.body.msg).toMatch(/otro parqueadero/);
    });

    it('answers 409 when the parking is full', async () => {
        const small = await createParking(socio.user.id, { capacity: 1 });
        const first = await api(socio.token).post('/api/vehicles').send({ id_parking: small.id, vehicle_plate: 'FUL001', model_vehicle: 'x' });
        expect(first.status).toBe(201);
        const second = await api(socio.token).post('/api/vehicles').send({ id_parking: small.id, vehicle_plate: 'FUL002', model_vehicle: 'x' });
        expect(second.status).toBe(409);
        expect(second.body.msg).toMatch(/no tiene suficiente espacio/);
    });

    it('never exceeds the capacity with concurrent entries', async () => {
        const small = await createParking(socio.user.id, { capacity: 2 });
        const plates = ['CON001', 'CON002', 'CON003', 'CON004', 'CON005'];
        const results = await Promise.all(
            plates.map((plate) => api(socio.token).post('/api/vehicles').send({ id_parking: small.id, vehicle_plate: plate, model_vehicle: 'x' })),
        );
        expect(results.filter((r) => r.status === 201)).toHaveLength(2);
        expect(results.filter((r) => r.status === 409)).toHaveLength(3);
        expect(await getModels().Vehicle.count({ where: { id_parking: small.id, status: 'IN' } })).toBe(2);
    });

    it('lets the same plate enter only once with concurrent requests', async () => {
        const results = await Promise.all([1, 2, 3].map(() => entry(socio.token, { vehicle_plate: 'RAC123' })));
        expect(results.filter((r) => r.status === 201)).toHaveLength(1);
        expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    });

    it('answers 403 in a parking of another partner (it was allowed before) and 404 for an unknown one', async () => {
        const res = await entry(otherSocio.token, { vehicle_plate: 'OTH123' });
        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('El parqueadero no le pertenece');
        expect((await entry(socio.token, { vehicle_plate: 'OTH124', id_parking: 999999 })).status).toBe(404);
    });

    it('is only for partners (an admin gets 403)', async () => {
        const res = await entry(admin.token, { vehicle_plate: 'ADM123' });
        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('Solo los socios pueden realizar esta acción');
    });

    it('validates the body', async () => {
        const res = await api(socio.token).post('/api/vehicles').send({});
        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['id_parking', 'model_vehicle', 'vehicle_plate']);
    });
});

describe('PUT /api/vehicles (exit)', () => {
    it('registers the exit and charges every started hour at the rate of the entry', async () => {
        const stay = await createStay(parking, socio.user, {
            plate: 'EXT-123',
            entry: new Date(Date.now() - (2 * 60 + 5) * 60 * 1000),
            costPerHour: 2000,
        });
        const res = await exit(socio.token, { vehicle_plate: 'ext123' });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ id: stay.id, plate_number: 'EXT-123', status: 'OUT', hours_charged: 3, total_cost: 6000 });
        expect(res.body.data.exit_time_local).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/);
    });

    it('answers 404 when the plate is not inside the parking', async () => {
        const res = await exit(socio.token, { vehicle_plate: 'NOP123' });
        expect(res.status).toBe(404);
        expect(res.body.msg).toMatch(/no existe la placa/);
    });

    it('answers 403 in a parking of another partner', async () => {
        await createStay(parking, socio.user, { plate: 'OWN-123', entry: new Date() });
        expect((await exit(otherSocio.token, { vehicle_plate: 'OWN123' })).status).toBe(403);
    });

    it('frees the place: the plate can enter again after leaving', async () => {
        await entry(socio.token, { vehicle_plate: 'AGN123' });
        expect((await exit(socio.token, { vehicle_plate: 'AGN123' })).status).toBe(200);
        expect((await entry(socio.token, { vehicle_plate: 'AGN123' })).status).toBe(201);
    });

    it('validates the body and requires a partner', async () => {
        expect((await api(socio.token).put('/api/vehicles').send({ id_parking: 'x' })).status).toBe(400);
        expect((await exit(admin.token, { vehicle_plate: 'AGN123' })).status).toBe(403);
    });
});
