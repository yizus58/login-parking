'use strict';

const { verifyToken } = require('../services/token.service');
const { findUserById } = require('../services/user.service');
const { unauthorized } = require('../utils/errors');

/**
 * Requires a valid token ("Authorization: Bearer <token>" or the bare token, as before) of a
 * user that still exists, and exposes it as req.user.
 */
async function authenticate(req, _res, next) {
    let token = req.header('Authorization');
    if (!token) throw unauthorized('No hay token en la peticion');
    if (token.startsWith('Bearer ')) token = token.slice(7).trim();

    const uid = verifyToken(token);
    const user = uid === null ? null : await findUserById(uid);
    if (!user) throw unauthorized('Token no valido');

    req.user = user;
    next();
}

module.exports = { authenticate };
