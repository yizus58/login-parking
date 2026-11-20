'use strict';

/** An error with an HTTP status, answered as { result: false, msg }. */
class AppError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        if (details !== undefined) this.details = details;
    }
}

const badRequest = (message, details) => new AppError(400, message, details);
const unauthorized = (message = 'No autenticado') => new AppError(401, message);
const forbidden = (message = 'No tiene permisos para realizar esta acción') => new AppError(403, message);
const notFound = (message) => new AppError(404, message);
const conflict = (message) => new AppError(409, message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
