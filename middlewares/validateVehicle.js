const { check } = require('express-validator');
const { validate } = require('../middlewares/validate');

const validateVehicle = [
    check('model_vehicle', 'La capacidad es obligatoria').not().isEmpty(),
    check('vehicle_plate', 'El costo por hora es obligatorio').not().isEmpty(),
    check('id_parking', 'El socio es obligatorio').not().isEmpty(),
    validate
];

const validateVehiclePlate = [
    check('id_parking', 'El parking es obligatorio').not().isEmpty(),
    check('vehicle_plate', 'El costo por hora es obligatorio').not().isEmpty(),
    validate
];

module.exports = { validateVehicle, validateVehiclePlate };