'use strict';

const { body, check, query } = require('express-validator');
const { dayMonthYear, idParam } = require('./common');

/** Read from the query string (a body on GET is still accepted, as before). */
const earnings = [
    check('id_parking', 'El parking es obligatorio').isInt({ min: 1 }).toInt(),
    dayMonthYear('start_date', 'La fecha de inicio es obligatoria'),
    dayMonthYear('end_date', 'La fecha de fin es obligatoria'),
];

const byId = [idParam('id', 'El ID parking es obligatorio')];

const excel = [...byId, dayMonthYear('date', 'Fecha inválida', query).optional()];

/** Storage keys have no path separators. */
const removeExcel = [
    body('nameFile', 'El nombre del archivo es obligatorio').isString().trim().matches(/^[A-Za-z0-9._-]{1,200}$/).withMessage('Nombre de archivo inválido'),
];

module.exports = { earnings, byId, excel, removeExcel };
