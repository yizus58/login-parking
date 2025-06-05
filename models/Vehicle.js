const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Parking = require('./Parking');

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    plate_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    entry_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    exit_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    id_parking:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Parking,
            key: 'id'
        }
    },
    id_admin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('IN', 'OUT'),
        allowNull: false,
        defaultValue: 'IN'
    },
}, {
    tableName: 'vehicles',
    timestamps: false,
    underscored: false
});

Vehicle.belongsTo(Parking, { foreignKey: 'id_parking', as: 'parking' });
Vehicle.belongsTo(User, { foreignKey: 'id_admin', as: 'admin' });