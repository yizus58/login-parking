'use strict';

const rankingService = require('../services/ranking.service');
const indicatorService = require('../services/indicator.service');

async function topVehicles(_req, res) {
    res.json({ result: true, data: await rankingService.topVehicles() });
}

async function topVehiclesByParking(req, res) {
    res.json({ result: true, data: await rankingService.topVehiclesByParking(req.user, req.valid.id) });
}

async function topPartners(_req, res) {
    res.json({ result: true, data: await rankingService.topPartnersThisWeek() });
}

async function topParkings(_req, res) {
    res.json({ result: true, data: await rankingService.topParkingsThisWeek() });
}

async function firstTimeVehicles(req, res) {
    res.json({ result: true, data: await indicatorService.firstTimeVehicles(req.user) });
}

module.exports = { topVehicles, topVehiclesByParking, topPartners, topParkings, firstTimeVehicles };
