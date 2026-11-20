'use strict';

const { body } = require('express-validator');

const login = [
    body('email', 'El email es obligatorio').isString().trim().isEmail().toLowerCase(),
    body('password', 'El password es obligatorio').isString().notEmpty(),
];

module.exports = { login };
