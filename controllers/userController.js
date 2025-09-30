require('dotenv').config();
const { response } = require('express');
const { validateUserRole, userRoleResponse} = require('../utils/validation');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const User = require('../models/User');

const createUser = async (req, res = response) => {
    const {email, password, username} = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== 1) {
            return userRoleResponse(validateUser, res);
        }

        // Perform validation within the controller to ensure DB is connected
        const emailExists = await User.findOne({ where: { email } });
        if (emailExists) {
            return res.status(400).json({ result: false, msg: 'El correo ya se encuentra registrado, por favor ingrese otro' });
        }
        const usernameExists = await User.findOne({ where: { username } });
        if (usernameExists) {
            return res.status(400).json({ result: false, msg: 'El usuario ya se encuentra registrado, por favor ingrese otro' });
        }

        const user = new User(req.body);

        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(password, salt);

        await user.save();

        const { password: userPassword, ...userResponse } = user.toJSON();

        res.status(201).json({
            result: true,
            data: userResponse
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            result: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getAllUsers = async (req, res = response) => {
    try {
        const uid = req.uid;

        const validateUser = await validateUserRole(uid);
        if (validateUser !== 1) {
            return userRoleResponse(validateUser, res);
        }

        const users = await User.findAll({ where: { role: 'SOCIO' } });
        
        const usersWithoutPassword = users.map(user => {
            const { password, ...rest } = user.toJSON();
            return rest;
        })

        res.json({
            result: true,
            data: usersWithoutPassword
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            result: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

module.exports = {
    createUser,
    getAllUsers
}
