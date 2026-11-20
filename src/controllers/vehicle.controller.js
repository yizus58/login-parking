'use strict';

const vehicleService = require('../services/vehicle.service');

async function entry(req, res) {
    res.status(201).json({ result: true, msg: 'Ingreso registrado correctamente', data: await vehicleService.registerEntry(req.user, req.valid) });
}

async function exit(req, res) {
    res.json({ result: true, msg: 'Salida registrada', data: await vehicleService.registerExit(req.user, req.valid) });
}

module.exports = { entry, exit };
