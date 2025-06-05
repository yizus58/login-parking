const { response } = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const validateExistingUser = async (email, username) => {
    const emailExist = await User.findOne({ where: { email } });
    if (emailExist) {
        throw new Error('El correo ya está registrado');
    }

    const usernameExist = await User.findOne({ where: { username } });
    if (usernameExist) {
        throw new Error('El usuario ya está registrado');
    }
}

const validateUserByEmailExists = async (email, res = response) => {
    return await User.findOne({ where: { email } });
}

const validatePassword = (password, userPassword, res = response) => {
    return bcrypt.compareSync(password, userPassword);
}

const validateUserRole = async (uid, res = response) => {
    const user = await User.findByPk(uid);
    if (!user) return 0;

    const roleCodes = {
        'ADMIN': 1,
        'USER': 2
    };

    return roleCodes[user.role] ?? 3;
}

const userRoleResponse = (errorNumber, res = response) => {
    switch (errorNumber) {
        case 0:
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        case 1:
            return res.status(403).json({
                ok: false,
                msg: 'No tiene permisos para realizar esta acción'
            });
        case 2:
            return res.status(403).json({
                ok: false,
                msg: 'Lo sentimos, unicamente los usuarios pueden realizar esta acción'
            });
        default:
            return res.status(500).json({
                ok: false,
                msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
            });
    }
}

module.exports = {
    validateExistingUser,
    userRoleResponse,
    validateUserByEmailExists,
    validateUserRole,
    validatePassword
};