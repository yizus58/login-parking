'use strict';

const ExcelJS = require('exceljs');
const { resetDatabase, closeAll, createUser, createParking, createStay, api } = require('../support/db');
const { setIntegrations } = require('../../src/services/container');

let admin;
let socio;
let otherSocio;
let parking;

const at = (iso) => new Date(iso);

beforeAll(async () => {
    await resetDatabase();
    admin = await createUser({ role: 'ADMIN' });
    socio = await createUser({ username: 'socio_details' });
    otherSocio = await createUser();
    parking = await createParking(socio.user.id, { name: 'Norte', cost_per_hour: 1000 });
    // 9 March 23:30 in Bogotá (10 March 04:30 UTC): belongs to the 9th, not the 10th.
    await createStay(parking, socio.user, { plate: 'BOG-001', entry: at('2026-03-10T02:30:00Z'), exit: at('2026-03-10T04:30:00Z') });
    // 10 March 00:30 and 18:00 in Bogotá.
    await createStay(parking, socio.user, { plate: 'BOG-002', entry: at('2026-03-10T05:00:00Z'), exit: at('2026-03-10T05:30:00Z') });
    await createStay(parking, socio.user, { plate: 'BOG-003', entry: at('2026-03-10T20:00:00Z'), exit: at('2026-03-10T23:00:00Z'), costPerHour: 1500 });
    // Still inside: never counted.
    await createStay(parking, socio.user, { plate: 'BOG-004', entry: at('2026-03-10T06:00:00Z') });
});
afterAll(async () => {
    setIntegrations();
    await closeAll();
});

const earnings = (token, query) => api(token).get('/api/details').query({ id_parking: parking.id, ...query });

describe('GET /api/details (earnings by period)', () => {
    it('sums the stays that ended within the Bogotá calendar days', async () => {
        const res = await earnings(socio.token, { start_date: '10-03-2026', end_date: '10-03-2026' });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            totalVehicles: 2,
            totalEarnings: 1000 + 3 * 1500,
            parkingName: 'Norte',
            timeZone: 'America/Bogota',
            startDate: '2026-03-10T05:00:00.000Z',
            endDate: '2026-03-11T04:59:59.999Z',
        });
    });

    it('includes the previous day when the range starts on the 9th', async () => {
        const res = await earnings(socio.token, { start_date: '09-03-2026', end_date: '10-03-2026' });
        expect(res.body.data.totalVehicles).toBe(3);
    });

    it('returns zeros, not an empty object, when nothing ended in the period', async () => {
        const res = await earnings(socio.token, { start_date: '01-01-2025', end_date: '02-01-2025' });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ totalVehicles: 0, totalEarnings: 0 });
    });

    it('validates the dates', async () => {
        expect((await earnings(socio.token, { start_date: '2026-03-10', end_date: '10-03-2026' })).status).toBe(400);
        expect((await earnings(socio.token, { start_date: '31-02-2026', end_date: '10-03-2026' })).status).toBe(400);
        const reversed = await earnings(socio.token, { start_date: '11-03-2026', end_date: '10-03-2026' });
        expect(reversed.status).toBe(400);
        expect(reversed.body.msg).toMatch(/menor/);
    });

    it('still accepts the parameters in a JSON body', async () => {
        const res = await api(socio.token).get('/api/details').send({ id_parking: parking.id, start_date: '10-03-2026', end_date: '10-03-2026' });
        expect(res.status).toBe(200);
        expect(res.body.data.totalVehicles).toBe(2);
    });

    it('answers 403 for another partner and for an admin', async () => {
        expect((await earnings(otherSocio.token, { start_date: '10-03-2026', end_date: '10-03-2026' })).status).toBe(403);
        expect((await earnings(admin.token, { start_date: '10-03-2026', end_date: '10-03-2026' })).status).toBe(403);
    });
});

describe('GET /api/details/:id (parking detail)', () => {
    it('returns the own parking with its vehicles', async () => {
        const res = await api(socio.token).get(`/api/details/${parking.id}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(parking.id);
        expect(res.body.data.vehicles).toHaveLength(4);
    });

    it('answers 403 for another partner and 404 for an unknown parking', async () => {
        expect((await api(otherSocio.token).get(`/api/details/${parking.id}`)).status).toBe(403);
        expect((await api(socio.token).get('/api/details/999999')).status).toBe(404);
    });
});

describe('GET /api/details/:id/excel', () => {
    const download = (token, query = {}) =>
        api(token)
            .get(`/api/details/${parking.id}/excel`)
            .query(query)
            .buffer(true)
            .parse((res, cb) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => cb(null, Buffer.concat(chunks)));
            });

    it('downloads the Excel of the requested day for the owner', async () => {
        const res = await download(socio.token, { date: '10-03-2026' });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/spreadsheetml/);
        expect(res.headers['content-disposition']).toMatch(/reporte_norte_2026-03-10\.xlsx/);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(res.body);
        const sheet = workbook.worksheets[0];
        expect(sheet.name).toBe('socio_details');
        const plates = [];
        sheet.eachRow((row, n) => n > 3 && row.getCell(2).value && plates.push(row.getCell(2).value));
        expect(plates).toEqual(['BOG-003', 'BOG-002']);
    });

    it('lets an admin download any parking and gives an empty sheet for a day without stays', async () => {
        const res = await download(admin.token, { date: '01-01-2025' });
        expect(res.status).toBe(200);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(res.body);
        const texts = [];
        workbook.worksheets[0].eachRow((row) => texts.push(String(row.getCell(1).value)));
        expect(texts).toContain('Sin registros de vehículos');
    });

    it('answers 403 for another partner and 400 for a bad date', async () => {
        expect((await api(otherSocio.token).get(`/api/details/${parking.id}/excel`)).status).toBe(403);
        expect((await api(socio.token).get(`/api/details/${parking.id}/excel?date=2026-03-10`)).status).toBe(400);
    });
});

describe('DELETE /api/details/excel', () => {
    it('lets an admin delete a stored report', async () => {
        const removed = [];
        setIntegrations({ storage: { remove: async (key) => removed.push(key) } });
        const res = await api(admin.token).delete('/api/details/excel').send({ nameFile: 'abc123def456' });
        expect(res.status).toBe(200);
        expect(removed).toEqual(['abc123def456']);
    });

    it('is refused to partners (any user could delete any file before)', async () => {
        expect((await api(socio.token).delete('/api/details/excel').send({ nameFile: 'abc' })).status).toBe(403);
    });

    it('rejects keys with path characters', async () => {
        expect((await api(admin.token).delete('/api/details/excel').send({ nameFile: '../other' })).status).toBe(400);
        expect((await api(admin.token).delete('/api/details/excel').send({})).status).toBe(400);
    });
});
