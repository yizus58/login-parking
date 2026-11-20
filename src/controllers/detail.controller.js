'use strict';

const parkingService = require('../services/parking.service');
const earningsService = require('../services/earnings.service');
const reportService = require('../services/report.service');
const { getStorage } = require('../services/container');

async function parkingDetail(req, res) {
    res.json({ result: true, data: await parkingService.getParkingDetail(req.user, req.valid.id) });
}

async function earnings(req, res) {
    res.json({ result: true, data: await earningsService.earningsByPeriod(req.user, req.valid) });
}

/** Downloads the Excel of the parking for ?date=DD-MM-YYYY (default today). */
async function excel(req, res) {
    const { content, filename, contentType } = await reportService.parkingDayExcel(req.user, req.valid.id, req.valid.date);
    res.attachment(filename).type(contentType).send(content);
}

async function removeExcel(req, res) {
    await getStorage().remove(req.valid.nameFile);
    res.json({ result: true, msg: 'Archivo eliminado correctamente' });
}

module.exports = { parkingDetail, earnings, excel, removeExcel };
