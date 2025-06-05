const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Parking = sequelize.define('Parking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cost_per_hour: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    id_partner: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
}, {
    tableName: 'parkings',
    timestamps: false
});


module.exports = Parking;