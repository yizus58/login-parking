'use strict';

const { DataTypes } = require('sequelize');
const { ROLES, ROLE_VALUES } = require('./roles');

module.exports = (sequelize) =>
    sequelize.define(
        'User',
        {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            username: { type: DataTypes.STRING, allowNull: false, unique: true },
            password: { type: DataTypes.STRING, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
            role: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ROLES.SOCIO,
                validate: { isIn: [ROLE_VALUES] },
            },
        },
        {
            tableName: 'users',
            // The password hash never leaves the model unless explicitly requested.
            defaultScope: { attributes: { exclude: ['password'] } },
            scopes: { withPassword: { attributes: { include: ['password'] } } },
        },
    );
