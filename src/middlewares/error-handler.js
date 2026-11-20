'use strict';

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const GENERIC_MESSAGE = 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte';

/** 404 for unknown routes. */
const notFoundHandler = (req, res) => res.status(404).json({ result: false, msg: `Ruta no encontrada: ${req.method} ${req.path}` });

/** Turns any error into the API shape { result: false, msg, errors? } with the right status. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
    let status = 500;
    let body = { result: false, msg: GENERIC_MESSAGE };

    if (err instanceof AppError) {
        status = err.status;
        body = { result: false, msg: err.message, ...(err.details ? { errors: err.details } : {}) };
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        body = { result: false, msg: 'El cuerpo de la petición no es un JSON válido' };
    } else if (err.type === 'entity.too.large') {
        status = 413;
        body = { result: false, msg: 'El cuerpo de la petición es demasiado grande' };
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        status = 409;
        body = { result: false, msg: 'El registro ya existe o entra en conflicto con otro' };
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        status = 409;
        body = { result: false, msg: 'El registro está relacionado con otros datos' };
    }

    if (status >= 500) logger.error(`${req.method} ${req.originalUrl} failed`, { error: err.message, stack: err.stack });
    if (res.headersSent) return req.socket.destroy();
    res.status(status).json(body);
}

module.exports = { errorHandler, notFoundHandler, GENERIC_MESSAGE };
