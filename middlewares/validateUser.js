const { check } = require('express-validator');
const { validate } = require('../middlewares/validate');

const validateUserNew = [
    check('username','El username es obligatorio').not().isEmpty(),
    check('password','El password es obligatorio').not().isEmpty(),
    check('email','El email es obligatorio').isEmail(),
    check('role', 'El rol es inválido').optional().isIn(['SOCIO', 'ADMIN']),
    validate
];

const validateUserUpdated = [
    check('id', 'El ID parking es obligatorio').isInt({min: 1}),
    check('username','El username es obligatorio').not().isEmpty(),
    check('password','El password es obligatorio').not().isEmpty(),
    check('email','El email es obligatorio').isEmail(),
    check('role', 'El rol es inválido').optional().isIn(['SOCIO', 'ADMIN']),
    validate
];



const validateUserLogin = [
    check('email','El email es obligatorio').isEmail(),
    check('password','El password es obligatorio').not().isEmpty(),
    validate
];

module.exports = { validateUserNew, validateUserLogin, validateUserUpdated };