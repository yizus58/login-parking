'use strict';

const { forbidden } = require('../utils/errors');

const MESSAGES = {
    ADMIN: 'Solo los administradores pueden realizar esta acción',
    SOCIO: 'Solo los socios pueden realizar esta acción',
};

/** Lets the request through only for the given roles (use after authenticate). */
const authorize =
    (...roles) =>
    (req, _res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw forbidden(roles.length === 1 ? MESSAGES[roles[0]] : undefined);
        }
        next();
    };

module.exports = { authorize };
