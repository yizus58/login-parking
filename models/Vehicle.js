const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    plate_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    model_vehicle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    entry_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    exit_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    id_parking: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'parkings',
            key: 'id'
        }
    },
    id_admin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    cost_per_hour: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('IN', 'OUT'),
        allowNull: false,
        defaultValue: 'IN'
    },
}, {
    tableName: 'vehicles',
    timestamps: false
});

module.exports = Vehicle;