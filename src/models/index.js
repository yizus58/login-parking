'use strict';

const { getSequelize } = require('../config/database');
const defineUser = require('./user.model');
const defineParking = require('./parking.model');
const defineVehicle = require('./vehicle.model');

let models = null;

/** Defines the models and their associations on the shared Sequelize instance (once). */
function getModels() {
    if (models) return models;
    const sequelize = getSequelize();
    const User = defineUser(sequelize);
    const Parking = defineParking(sequelize);
    const Vehicle = defineVehicle(sequelize);

    User.hasMany(Parking, { foreignKey: 'id_partner', as: 'parkings' });
    Parking.belongsTo(User, { foreignKey: 'id_partner', as: 'partner' });
    Parking.hasMany(Vehicle, { foreignKey: 'id_parking', as: 'vehicles' });
    Vehicle.belongsTo(Parking, { foreignKey: 'id_parking', as: 'parking' });
    Vehicle.belongsTo(User, { foreignKey: 'id_admin', as: 'registeredBy' });

    models = { sequelize, User, Parking, Vehicle };
    return models;
}

/** Tests only: forget the models (after the connection was closed). */
function resetModels() {
    models = null;
}

module.exports = { getModels, resetModels, VEHICLE_STATUS: defineVehicle.VEHICLE_STATUS };
