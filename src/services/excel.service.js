'use strict';

const ExcelJS = require('exceljs');

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CURRENCY_FORMAT = '"$"#,##0.00;[Red]-"$"#,##0.00';

/** Excel sheet names: at most 31 characters and none of : \ / ? * [ ]. */
const sheetName = (name) => (String(name || '') || 'usuario').replace(/[:\\/?*[\]]/g, '_').substring(0, 31);

/** Excel with the stays of one parking: plate, model, exit time (local) and cost. */
async function buildParkingReport(detail) {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(sheetName(detail.username));

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = `Usuario: ${detail.username || ''}  |  Parqueadero a cargo: ${detail.parking || ''}`;
    sheet.getCell('A1').font = { bold: true, size: 12 };
    sheet.addRow([]);
    const header = sheet.addRow(['#', 'Placa', 'Modelo', 'Fecha', 'Costo']);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle', horizontal: 'center' };

    detail.vehicles.forEach((vehicle, index) => {
        const row = sheet.addRow([index + 1, vehicle.plate_number, vehicle.model_vehicle, vehicle.day, vehicle.total_cost]);
        row.getCell(5).numFmt = CURRENCY_FORMAT;
    });

    sheet.addRow([]);
    if (detail.vehicles.length > 0) {
        const subtotal = sheet.addRow(['', '', '', 'Subtotal:', detail.total_earnings]);
        subtotal.getCell(5).numFmt = CURRENCY_FORMAT;
        subtotal.font = { bold: true };
        sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 5 } };
    } else {
        sheet.addRow(['Sin registros de vehículos']);
    }
    [5, 15, 25, 18, 15].forEach((width, index) => (sheet.getColumn(index + 1).width = width));

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

module.exports = { buildParkingReport, sheetName, EXCEL_MIME };
