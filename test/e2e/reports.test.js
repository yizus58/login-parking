'use strict';

const ExcelJS = require('exceljs');
const { resetDatabase, closeAll, createUser, createParking, createStay } = require('../support/db');
const { runDailyReports, collectDailySummaries } = require('../../src/services/report.service');
const { previousDayRange } = require('../../src/utils/time');

let socioA;
let socioB;
let parkingA;
let parkingB;

// The job runs at 00:05 Bogotá on 11 March and reports 10 March (Bogotá).
const NOW = new Date('2026-03-11T05:05:00Z');

beforeAll(async () => {
    await resetDatabase();
    socioA = await createUser({ username: 'socio_<a>', email: 'a@example.com' });
    socioB = await createUser({ username: 'socio_b', email: 'b@example.com' });
    parkingA = await createParking(socioA.user.id, { name: 'Alfa', cost_per_hour: 1000 });
    parkingB = await createParking(socioB.user.id, { name: 'Beta', cost_per_hour: 2000 });
    await createStay(parkingA, socioA.user, { plate: 'REP-001', entry: new Date('2026-03-10T12:00:00Z'), exit: new Date('2026-03-10T13:30:00Z') });
    await createStay(parkingA, socioA.user, { plate: 'REP-002', entry: new Date('2026-03-11T04:00:00Z'), exit: new Date('2026-03-11T04:59:00Z') });
    await createStay(parkingB, socioB.user, { plate: 'REP-003', entry: new Date('2026-03-10T15:00:00Z'), exit: new Date('2026-03-10T15:30:00Z') });
    // Outside the day: 9 March 23:59 Bogotá and 11 March 00:01 Bogotá.
    await createStay(parkingB, socioB.user, { plate: 'REP-004', entry: new Date('2026-03-10T04:00:00Z'), exit: new Date('2026-03-10T04:59:00Z') });
    await createStay(parkingB, socioB.user, { plate: 'REP-005', entry: new Date('2026-03-11T05:00:00Z'), exit: new Date('2026-03-11T05:01:00Z') });
});
afterAll(closeAll);

function fakes({ failFor = [] } = {}) {
    const sent = [];
    const uploads = new Map();
    const removed = [];
    let n = 0;
    return {
        sent,
        uploads,
        removed,
        notifications: {
            sendEmail: async (email) => {
                if (failFor.includes(email.recipients[0])) throw new Error('mail down');
                sent.push(email);
            },
        },
        storage: {
            upload: async (buffer, type) => {
                const key = `key${++n}`;
                uploads.set(key, { buffer, type });
                return key;
            },
            remove: async (key) => removed.push(key),
        },
    };
}

describe('daily report', () => {
    it('covers exactly the previous Bogotá day', async () => {
        const summaries = await collectDailySummaries(previousDayRange(NOW, 'America/Bogota'));
        expect(summaries).toEqual([
            { id: parkingA.id, name: 'Alfa', partner: { id: socioA.user.id, username: 'socio_<a>', email: 'a@example.com' }, vehicle_count: 2, total_earnings: 3000 },
            { id: parkingB.id, name: 'Beta', partner: { id: socioB.user.id, username: 'socio_b', email: 'b@example.com' }, vehicle_count: 1, total_earnings: 2000 },
        ]);
    });

    it('e-mails every partner a summary and the Excel detail as an attachment', async () => {
        const f = fakes();
        const result = await runDailyReports({ ...f, now: NOW });
        expect(result).toEqual({ summaries: { sent: 2, failed: 0 }, details: { sent: 2, failed: 0 } });

        const summaryA = f.sent.find((e) => !e.attachments && e.recipients[0] === 'a@example.com');
        expect(summaryA).toMatchObject({ userId: socioA.user.id, recipients: ['a@example.com'], subject: 'Reporte diario de parqueaderos' });
        expect(summaryA.html).toContain('10-03-2026');
        expect(summaryA.html).toContain('socio_&lt;a&gt;');
        expect(summaryA.html).not.toContain('última hora');

        const detailA = f.sent.find((e) => e.attachments && e.recipients[0] === 'a@example.com');
        expect(detailA.attachments).toEqual([{ name_file: 'reporte_alfa_2026-03-10.xlsx', s3_name: expect.any(String) }]);
        const upload = f.uploads.get(detailA.attachments[0].s3_name);
        expect(upload.type).toMatch(/spreadsheetml/);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(upload.buffer);
        const plates = [];
        workbook.worksheets[0].eachRow((row, i) => i > 3 && row.getCell(2).value && plates.push(row.getCell(2).value));
        expect(plates).toEqual(['REP-001', 'REP-002']);
        expect(f.removed).toEqual([]);
    });

    it('keeps going when one e-mail fails and deletes the orphan upload', async () => {
        const f = fakes({ failFor: ['a@example.com'] });
        const result = await runDailyReports({ ...f, now: NOW });
        expect(result).toEqual({ summaries: { sent: 1, failed: 1 }, details: { sent: 1, failed: 1 } });
        expect(f.removed).toHaveLength(1);
        expect(f.sent.every((e) => e.recipients[0] === 'b@example.com')).toBe(true);
    });

    it('sends nothing for a day without stays', async () => {
        const f = fakes();
        const result = await runDailyReports({ ...f, now: new Date('2025-01-02T12:00:00Z') });
        expect(result).toEqual({ summaries: { sent: 0, failed: 0 }, details: { sent: 0, failed: 0 } });
        expect(f.sent).toEqual([]);
    });
});
