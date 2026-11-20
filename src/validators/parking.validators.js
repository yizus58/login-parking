'use strict';

const { body } = require('express-validator');
const { idParam, positiveInt, requiredText } = require('./common');

const fields = () => [
    requiredText('name', 'El nombre es obligatorio'),
    requiredText('address', 'La dirección es obligatoria'),
    positiveInt('capacity', 'La capacidad debe ser un entero mayor a 0'),
    body('cost', 'El costo por hora debe ser un número mayor a 0').isFloat({ gt: 0 }).toFloat(),
    positiveInt('id_partner', 'El socio es obligatorio'),
];

const create = fields();
const update = [idParam('id', 'El ID parking es obligatorio'), ...fields()];
const byId = [idParam('id', 'El ID parking es obligatorio')];

module.exports = { create, update, byId };
