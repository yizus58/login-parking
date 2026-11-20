'use strict';

const authService = require('../services/auth.service');

async function login(req, res) {
    const { email, password } = req.valid;
    res.json({ result: true, ...(await authService.login(email, password)) });
}

function renew(req, res) {
    res.json({ result: true, ...authService.renew(req.user) });
}

module.exports = { login, renew };
