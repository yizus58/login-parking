const { check } = require('express-validator');
const { validate } = require('../middlewares/validate');

const validateParking = [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('address', 'La dirección es obligatoria').not().isEmpty(),
    check('capacity', 'La capacidad es obligatoria').not().isEmpty(),
    check('cost', 'El costo por hora es obligatorio').not().isEmpty(),
    check('id_partner', 'El socio es obligatorio').not().isEmpty(),
    validate
];

const validateUpdateParking = [
    check('id_parking', 'El parking es obligatorio').not().isEmpty(),
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('address', 'La dirección es obligatoria').not().isEmpty(),
    check('capacity', 'La capacidad es obligatoria').not().isEmpty(),
    check('cost', 'El costo por hora es obligatorio').not().isEmpty(),
    check('id_partner', 'El socio es obligatorio').not().isEmpty(),
    validate
];

const validateIdParking = [
    check('id_parking', 'El parking es obligatorio').not().isEmpty(),
    validate
];

const validateEarningPeriod = [
    check('id_parking', 'El parking es obligatorio').not().isEmpty(),
    check('start_date', 'La fecha de inicio es obligatoria').not().isEmpty(),
    check('end_date', 'La fecha de fin es obligatoria').not().isEmpty(),
    validate
];

module.exports = { validateEarningPeriod, validateParking, validateUpdateParking, validateIdParking };