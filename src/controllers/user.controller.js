'use strict';

const userService = require('../services/user.service');

async function create(req, res) {
    res.status(201).json({ result: true, data: await userService.createUser(req.valid) });
}

async function list(_req, res) {
    res.json({ result: true, data: await userService.listPartners() });
}

async function update(req, res) {
    const { id, ...changes } = req.valid;
    res.json({ result: true, data: await userService.updateUser(id, changes, req.user) });
}

module.exports = { create, list, update };
