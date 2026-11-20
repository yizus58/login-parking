'use strict';

const parkingService = require('../services/parking.service');
const { ROLES } = require('../models/roles');

async function create(req, res) {
    res.status(201).json({ result: true, msg: 'Parqueadero creado correctamente', data: await parkingService.createParking(req.valid) });
}

async function update(req, res) {
    const { id, ...changes } = req.valid;
    res.json({ result: true, msg: 'Parqueadero actualizado correctamente', data: await parkingService.updateParking(id, changes) });
}

/** ADMIN: every parking with partner and vehicles. SOCIO: its own parkings. */
async function list(req, res) {
    const data = req.user.role === ROLES.ADMIN ? await parkingService.listParkings() : await parkingService.listOwnParkings(req.user);
    res.json({ result: true, data });
}

async function getById(req, res) {
    res.json({ result: true, data: await parkingService.getParking(req.user, req.valid.id) });
}

async function remove(req, res) {
    await parkingService.removeParking(req.valid.id);
    res.json({ result: true, msg: 'Parqueadero eliminado correctamente' });
}

module.exports = { create, update, list, getById, remove };
