const { check } = require('express-validator');
const { validate } = require('../middlewares/validate');

const validateEmailRequest = [
    check('email','El email es obligatorio').isEmail(),
    check('text','El mensaje es obligatorio').not().isEmpty(),
    check('vehicle_plate', 'La placa es obligatoria').not().isEmpty(),
    check('parking_name', 'El nombre del parqueadero es obligatorio').not().isEmpty(),
    validate
];

const validateAllEmailRequest = [
    check('text','El mensaje es obligatorio').not().isEmpty(),
    check('vehicle_plate', 'La placa es obligatoria').not().isEmpty(),
    check('parking_name', 'El nombre del parqueadero es obligatorio').not().isEmpty(),
    validate
];

module.exports = { validateEmailRequest, validateAllEmailRequest };