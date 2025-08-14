require('dotenv').config();
const { generateJWT } = require('../helpers/jwt');
const { response } = require('express');
const { validateUserRole, validateExistingUser, validateUserByEmailExists, validatePassword, userRoleResponse} = require('../utils/validation');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const User = require('../models/user');
const idAdmin = Number(process.env.ID_ADMIN);

User.sequelize.sync().then(async () => {
    const adminEmail = process.env.ADMIN_EMAIL;

    const admin = await User.findOne({ where: { email: adminEmail } });
    if (!admin) {

        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);

        await User.create({
            username: 'admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN'
        });
    }
});


const createUser = async (req, res = response) => {
    const {email, password, username} = req.body;

    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const validateExistUser = await validateExistingUser(email, username, res);
        if (validateExistUser) return validateExistUser;

        const user = new User(req.body);

        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(password, salt);

        await user.save();

        delete user.password;

        res.status(201).json({
            result: true,
            data: user
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            result: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const login = async (req, res = response) => {
    const { email, password } = req.body;

    try {
        const user = await validateUserByEmailExists(email);
        if (!user) {
            return res.status(404).json({
                result: false,
                msg: 'Su email no se encuentra registrado',
            });
        }

        const validPassword = validatePassword(password, user.password);
        if (!validPassword) {
            return res.status(404).json({
                result: false,
                msg: 'Su contraseña es incorrecta',
            });
        }

        const token = await generateJWT(user.id);

        delete user.password;

        res.json({
            result: true,
            data: user,
            token
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({
            result: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const renewToken = async (req, res = response) => {
    const uid = req.uid;

    const token = await generateJWT(uid);

    const user = await User.findByPk(uid);

    res.json({
        result: true,
        data: user,
        token
    });
}

const getAllUsers = async (req, res = response) => {
    try {
        const uid = req.uid;

        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const users = await User.findAll();

        const usersFilter = users.filter(user => user.role === 'SOCIO');
        if (usersFilter.length === 0) {
            return res.json({
                result: false,
                msg: 'No hay usuarios registrados, por favor registre un usuario'
            });
        }
        const usersWithoutPassword = usersFilter.map(user => {
            const { password, ...rest } = user.toJSON();
            return rest;
        })

        res.json({
            result: true,
            data: usersWithoutPassword
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({
            result: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

module.exports = {
    createUser,
    login,
    renewToken,
    getAllUsers
}