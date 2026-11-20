'use strict';

const { DataTypes } = require('sequelize');

const VEHICLE_STATUS = Object.freeze({ IN: 'IN', OUT: 'OUT' });

/**
 * One stay of a vehicle in a parking. `id_admin` is the user who registered the entry (the
 * partner operating the parking); the column keeps its historical name.
 */
const defineVehicle = (sequelize) =>
    sequelize.define(
        'Vehicle',
        {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plate_number: { type: DataTypes.STRING, allowNull: false },
            model_vehicle: { type: DataTypes.STRING, allowNull: false },
            entry_time: { type: DataTypes.DATE, allowNull: false },
            exit_time: { type: DataTypes.DATE, allowNull: true },
            id_parking: { type: DataTypes.INTEGER, allowNull: false },
            id_admin: { type: DataTypes.INTEGER, allowNull: false },
            cost_per_hour: { type: DataTypes.DOUBLE, allowNull: false },
            status: {
                type: DataTypes.ENUM(...Object.values(VEHICLE_STATUS)),
                allowNull: false,
                defaultValue: VEHICLE_STATUS.IN,
            },
        },
        { tableName: 'vehicles' },
    );

module.exports = defineVehicle;
module.exports.VEHICLE_STATUS = VEHICLE_STATUS;
