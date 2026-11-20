'use strict';

const ExcelJS = require('exceljs');
const { buildParkingReport, sheetName } = require('../../src/services/excel.service');
const { dailySummaryHtml, dailyDetailHtml } = require('../../src/templates/report-emails');
const { escapeHtml, money } = require('../../src/templates/html');

async function rows(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const values = [];
    sheet.eachRow((row) => values.push(row.values.slice(1)));
    return { sheet, values };
}

describe('Excel report', () => {
    it('lists the stays with a subtotal', async () => {
        const buffer = await buildParkingReport({
            username: 'socio',
            parking: 'Norte',
            vehicles: [
                { plate_number: 'AAA-111', model_vehicle: 'Mazda', day: '10-03-2026 12:00', total_cost: 3000 },
                { plate_number: 'BBB-222', model_vehicle: 'Kia', day: '10-03-2026 13:00', total_cost: 1000 },
            ],
            total_earnings: 4000,
        });
        const { sheet, values } = await rows(buffer);
        expect(sheet.name).toBe('socio');
        expect(values[0][0]).toBe('Usuario: socio  |  Parqueadero a cargo: Norte');
        expect(values[1]).toEqual(['#', 'Placa', 'Modelo', 'Fecha', 'Costo']);
        expect(values[2]).toEqual([1, 'AAA-111', 'Mazda', '10-03-2026 12:00', 3000]);
        expect(values[4]).toEqual(['', '', '', 'Subtotal:', 4000]);
    });

    it('says when there are no stays', async () => {
        const { values } = await rows(await buildParkingReport({ username: 'u', parking: 'p', vehicles: [], total_earnings: 0 }));
        expect(values.map((v) => v[0])).toContain('Sin registros de vehículos');
    });

    it('makes valid sheet names', () => {
        expect(sheetName('a/b:c*d?e[f]g\\h')).toBe('a_b_c_d_e_f_g_h');
        expect(sheetName('x'.repeat(40))).toHaveLength(31);
        expect(sheetName('')).toBe('usuario');
    });
});

describe('e-mail templates', () => {
    it('escape user data', () => {
        expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
        expect(escapeHtml(null)).toBe('');
        const html = dailySummaryHtml({ partner: { username: '<script>' }, name: 'P&Q', vehicle_count: 2, total_earnings: 3000 }, '10-03-2026');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('P&amp;Q');
        expect(html).not.toContain('<script>');
    });

    it('describe the reported day, not "the last hour"', () => {
        const summary = dailySummaryHtml({ partner: { username: 'u' }, name: 'N', vehicle_count: 2, total_earnings: 3000 }, '10-03-2026');
        expect(summary).toContain('El 10-03-2026 salieron <b>2</b> vehículos');
        expect(summary).toContain(money(3000));
        expect(summary).not.toMatch(/última hora/);
        const detail = dailyDetailHtml({ username: 'u', parking: 'N', total_vehicles: 4 }, '10-03-2026');
        expect(detail).toContain('<b>4</b> vehículos');
        expect(detail).toContain('Excel adjunto');
    });

    it('format pesos', () => {
        expect(money(3000)).toMatch(/3\.000/);
        expect(money('x')).toMatch(/0/);
    });
});
