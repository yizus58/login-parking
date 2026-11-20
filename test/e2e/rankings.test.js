'use strict';

const { resetDatabase, closeAll, createUser, createParking, createStay, api } = require('../support/db');
const rankingService = require('../../src/services/ranking.service');

let admin;
let socioA;
let socioB;
let parkingA;
let parkingB;

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const DAYS_40 = 40 * 24 * 60;

beforeAll(async () => {
    await resetDatabase();
    admin = await createUser({ role: 'ADMIN' });
    socioA = await createUser({ username: 'socio_a' });
    socioB = await createUser({ username: 'socio_b' });
    parkingA = await createParking(socioA.user.id, { name: 'A', cost_per_hour: 1000 });
    parkingB = await createParking(socioB.user.id, { name: 'B', cost_per_hour: 5000 });

    // AAA-111: 3 visits (2 in A, 1 in B); BBB-222: 2 in A; CCC-333: 1 in B (inside, first time).
    await createStay(parkingA, socioA.user, { plate: 'AAA-111', model: 'Old model', entry: minutesAgo(DAYS_40 + 60), exit: minutesAgo(DAYS_40) });
    await createStay(parkingA, socioA.user, { plate: 'AAA-111', model: 'New model', entry: minutesAgo(30), exit: minutesAgo(1) });
    await createStay(parkingB, socioB.user, { plate: 'AAA-111', entry: minutesAgo(2) });
    await createStay(parkingA, socioA.user, { plate: 'BBB-222', entry: minutesAgo(50), exit: minutesAgo(1) });
    await createStay(parkingA, socioA.user, { plate: 'BBB-222', entry: minutesAgo(10) });
    await createStay(parkingB, socioB.user, { plate: 'CCC-333', entry: minutesAgo(3) });
    await createStay(parkingA, socioA.user, { plate: 'DDD-444', entry: minutesAgo(4) });
});
afterAll(closeAll);

describe('GET /api/ranked-vehicles', () => {
    it('ranks plates by visits across all parkings with their latest model', async () => {
        const res = await api(admin.token).get('/api/ranked-vehicles');
        expect(res.status).toBe(200);
        expect(res.body.data[0]).toEqual({ plate_number: 'AAA-111', model_vehicle: 'Mazda 3', total_visits: 3 });
        expect(res.body.data[1]).toMatchObject({ plate_number: 'BBB-222', total_visits: 2 });
    });

    it('is only for admins', async () => {
        expect((await api(socioA.token).get('/api/ranked-vehicles')).status).toBe(403);
    });
});

describe('GET /api/ranked-vehicles/:id', () => {
    it('ranks the plates of that parking (the id was ignored before)', async () => {
        const res = await api(admin.token).get(`/api/ranked-vehicles/${parkingB.id}`);
        expect(res.status).toBe(200);
        expect(res.body.data.parking).toEqual({ id: parkingB.id, name: 'B' });
        expect(res.body.data.vehicles.map((v) => v.plate_number).sort()).toEqual(['AAA-111', 'CCC-333']);
    });

    it('lets the owner see its parking, not another one', async () => {
        const own = await api(socioA.token).get(`/api/ranked-vehicles/${parkingA.id}`);
        expect(own.status).toBe(200);
        expect(own.body.data.vehicles[0]).toMatchObject({ plate_number: 'AAA-111', model_vehicle: 'New model', total_visits: 2 });
        expect((await api(socioA.token).get(`/api/ranked-vehicles/${parkingB.id}`)).status).toBe(403);
        expect((await api(admin.token).get('/api/ranked-vehicles/999999')).status).toBe(404);
    });
});

describe('GET /api/ranked-partners', () => {
    it('ranks partners by entries this week', async () => {
        const res = await api(admin.token).get('/api/ranked-partners');
        expect(res.status).toBe(200);
        const partners = res.body.data.top_partners;
        expect(partners[0]).toEqual({ id: socioA.user.id, partner_name: 'socio_a', vehicle_count: 4 });
        expect(partners[1]).toEqual({ id: socioB.user.id, partner_name: 'socio_b', vehicle_count: 2 });
    });

    it('is only for admins', async () => {
        expect((await api(socioA.token).get('/api/ranked-partners')).status).toBe(403);
    });
});

describe('GET /api/ranked-parkings', () => {
    it('ranks parkings by the earnings of the stays that ended this week', async () => {
        const res = await api(admin.token).get('/api/ranked-parkings');
        expect(res.status).toBe(200);
        expect(res.body.data.top_parkings).toEqual([{ id: parkingA.id, name: 'A', total_earnings: 2000, vehicle_count: 2 }]);
    });

    it('is only for admins', async () => {
        expect((await api(socioB.token).get('/api/ranked-parkings')).status).toBe(403);
    });
});

describe('week boundaries in Bogotá (service)', () => {
    it('counts Monday 00:00 Bogotá in the new week and Sunday 23:59 in the previous one', async () => {
        const parking = await createParking(socioB.user.id, { name: 'Week', cost_per_hour: 100 });
        // Monday 2026-03-16 00:10 Bogotá = 05:10 UTC; Sunday 2026-03-15 23:50 Bogotá = 2026-03-16 04:50 UTC.
        await createStay(parking, socioB.user, { plate: 'WEK-001', entry: new Date('2026-03-16T05:10:00Z'), exit: new Date('2026-03-16T05:20:00Z') });
        await createStay(parking, socioB.user, { plate: 'WEK-002', entry: new Date('2026-03-16T04:50:00Z'), exit: new Date('2026-03-16T04:55:00Z') });

        const week = await rankingService.topPartnersThisWeek(new Date('2026-03-18T15:00:00Z'));
        expect(week.week_start).toEqual(new Date('2026-03-16T05:00:00Z'));
        expect(week.top_partners).toEqual([{ id: socioB.user.id, partner_name: 'socio_b', vehicle_count: 1 }]);

        const previous = await rankingService.topParkingsThisWeek(new Date('2026-03-15T12:00:00Z'));
        expect(previous.top_parkings).toEqual([{ id: parking.id, name: 'Week', total_earnings: 100, vehicle_count: 1 }]);
    });
});

describe('GET /api/indicators (first-time vehicles inside)', () => {
    it('shows an admin every first-time vehicle inside, with its parking', async () => {
        const res = await api(admin.token).get('/api/indicators');
        expect(res.status).toBe(200);
        expect(res.body.data.map((v) => v.plate_number).sort()).toEqual(['CCC-333', 'DDD-444']);
        expect(res.body.data.find((v) => v.plate_number === 'CCC-333').parking).toEqual({ id: parkingB.id, name: 'B' });
    });

    it('shows a partner only its parkings', async () => {
        const res = await api(socioA.token).get('/api/indicators');
        expect(res.body.data.map((v) => v.plate_number)).toEqual(['DDD-444']);
    });

    it('requires authentication', async () => {
        expect((await api().get('/api/indicators')).status).toBe(401);
    });
});
