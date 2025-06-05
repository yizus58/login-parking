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

        await validateExistingUser(email, username);

        const user = new User(req.body);

        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(password, salt);

        await user.save();

        res.status(201).json({
            ok: true,
            user
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
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
                ok: false,
                msg: 'Su email no se encuentra registrado',
            });
        }

        const validPassword = validatePassword(password, user.password);
        if (!validPassword) {
            return res.status(404).json({
                ok: false,
                msg: 'Su contraseña es incorrecta',
            });
        }

        const token = await generateJWT(user.id);

        res.json({
            ok: true,
            user,
            token
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const renewToken = async (req, res = response) => {
    const uid = req.uid;

    const token = await generateJWT(uid);

    const user = await User.findByPk(uid);

    res.json({
        ok: true,
        user,
        token
    });
}

const clearTable = async (req, res = response) => {
    try {
        await User.destroy({
            where: {},
            truncate: true
        });
        res.json({
            ok: true,
            msg: 'Tabla limpiada correctamente'
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
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
                ok: false,
                msg: 'No hay usuarios registrados, por favor registre un usuario'
            });
        }

        res.json({
            ok: true,
            users: usersFilter
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const listTables = async (req, res = response) => {
    try {
        const tables = await User.sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        );
        if (!tables || tables.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No hay tablas registradas'
            });
        }

        res.json({
            ok: true,
            tables: tables[0]
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

module.exports = {
    createUser,
    login,
    renewToken,
    clearTable,
    getAllUsers,
    listTables
}