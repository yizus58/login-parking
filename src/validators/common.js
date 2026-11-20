'use strict';

const { body, param, check } = require('express-validator');

const MAX_TEXT = 255;
const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;

const idParam = (name = 'id', message = 'El ID debe ser un entero positivo') => param(name, message).isInt({ min: 1 }).toInt();

const requiredText = (field, message, chain = body) =>
    chain(field, message).isString().trim().notEmpty().isLength({ max: MAX_TEXT }).withMessage(`Máximo ${MAX_TEXT} caracteres`);

const positiveInt = (field, message, chain = body) => chain(field, message).isInt({ min: 1 }).toInt();

const dayMonthYear = (field, message, chain = check) =>
    chain(field, message).isString().trim().matches(DATE_PATTERN).withMessage('Formato de fecha inválido. Use: DD-MM-YYYY');

module.exports = { idParam, requiredText, positiveInt, dayMonthYear, MAX_TEXT };
