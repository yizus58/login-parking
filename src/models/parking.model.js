'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
    sequelize.define(
        'Parking',
        {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, allowNull: false },
            address: { type: DataTypes.STRING, allowNull: false },
            capacity: { type: DataTypes.INTEGER, allowNull: false },
            cost_per_hour: { type: DataTypes.DOUBLE, allowNull: false },
            id_partner: { type: DataTypes.INTEGER, allowNull: false },
        },
        { tableName: 'parkings' },
    );
