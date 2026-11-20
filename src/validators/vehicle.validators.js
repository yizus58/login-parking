'use strict';

const { positiveInt, requiredText } = require('./common');

const entry = [
    positiveInt('id_parking', 'El parking es obligatorio'),
    requiredText('vehicle_plate', 'La placa es obligatoria'),
    requiredText('model_vehicle', 'El modelo del vehículo es obligatorio'),
];

const exit = [positiveInt('id_parking', 'El parking es obligatorio'), requiredText('vehicle_plate', 'La placa es obligatoria')];

module.exports = { entry, exit };
