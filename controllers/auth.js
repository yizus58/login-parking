require('dotenv').config();
const { generateJWT } = require('../helpers/jwt');
const { response } = require('express');
const { validateUserByEmailExists, validatePassword } = require('../utils/validation');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const User = require('../models/User');

async function ensureAdminSeed() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) return;
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
    } catch (e) {
        logger.error('Error ensuring admin seed:', e);
    }
}

if (process.env.NODE_ENV !== 'test') {
    User.sequelize.sync().then(() => ensureAdminSeed());
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

        const { password: userPassword, ...userResponse } = user.toJSON();

        res.json({
            result: true,
            data: userResponse,
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

    const { password, ...userResponse } = user.toJSON();

    res.json({
        result: true,
        data: userResponse,
        token
    });
}

module.exports = {
    login,
    renewToken,
    ensureAdminSeed
}
