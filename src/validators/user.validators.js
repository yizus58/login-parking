'use strict';

const { body } = require('express-validator');
const { ROLE_VALUES } = require('../models/roles');
const { idParam, requiredText } = require('./common');

const MIN_PASSWORD = 8;

const email = () => body('email', 'El email es obligatorio').isString().trim().isEmail().isLength({ max: 255 }).toLowerCase();
const password = () =>
    body('password', `El password debe tener al menos ${MIN_PASSWORD} caracteres`).isString().isLength({ min: MIN_PASSWORD, max: 72 });
const role = () => body('role', `El rol es inválido, use: ${ROLE_VALUES.join(', ')}`).optional().isIn(ROLE_VALUES);

const create = [requiredText('username', 'El username es obligatorio'), email(), password(), role()];

/** Password optional on update (kept when absent). */
const update = [idParam('id'), requiredText('username', 'El username es obligatorio'), email(), password().optional(), role()];

module.exports = { create, update, MIN_PASSWORD };
