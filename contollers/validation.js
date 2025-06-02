const { response } = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const validateUserRole = async (uid) => {
    const user = await User.findByPk(uid);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    if (user.role !== 'ADMIN') {
        throw new Error('No tienes permisos para realizar esta acción');
    }
}

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

module.exports = {
    validateUserRole,
    validateExistingUser,
    validateUserByEmailExists,
    validatePassword
};