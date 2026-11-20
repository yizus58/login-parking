'use strict';

const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');

/** HS256 token carrying the user id. */
function signToken(userId) {
    const { jwtKey, jwtExpiresIn } = getConfig().auth;
    return jwt.sign({ uid: userId }, jwtKey, { algorithm: 'HS256', expiresIn: jwtExpiresIn });
}

/** The user id of a valid, unexpired token; null otherwise. */
function verifyToken(token) {
    try {
        const payload = jwt.verify(token, getConfig().auth.jwtKey, { algorithms: ['HS256'] });
        return Number.isInteger(payload?.uid) ? payload.uid : null;
    } catch {
        return null;
    }
}

module.exports = { signToken, verifyToken };
