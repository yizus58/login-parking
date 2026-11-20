'use strict';

const bcrypt = require('bcryptjs');
const { Op, fn, col, where } = require('sequelize');
const { getConfig } = require('../config/env');
const { getModels } = require('../models');
const { ROLES } = require('../models/roles');
const { conflict, notFound } = require('../utils/errors');
const logger = require('../utils/logger');

const hashPassword = (password) => bcrypt.hash(password, getConfig().auth.bcryptRounds);

/** Public shape of a user (never the password hash). */
const toUserResponse = (user) => ({ id: user.id, username: user.username, email: user.email, role: user.role });

const sameText = (column, value) => where(fn('lower', col(column)), String(value).trim().toLowerCase());

async function ensureUnique({ email, username }, exceptId) {
    const { User } = getModels();
    const notSelf = exceptId ? { id: { [Op.ne]: exceptId } } : {};
    if (email && (await User.findOne({ where: { [Op.and]: [sameText('email', email), notSelf] } }))) {
        throw conflict('El correo ya se encuentra registrado, por favor ingrese otro');
    }
    if (username && (await User.findOne({ where: { [Op.and]: [sameText('username', username), notSelf] } }))) {
        throw conflict('El usuario ya se encuentra registrado, por favor ingrese otro');
    }
}

async function createUser({ username, email, password, role = ROLES.SOCIO }) {
    const { User } = getModels();
    await ensureUnique({ email, username });
    const user = await User.create({ username, email, password: await hashPassword(password), role });
    return toUserResponse(user);
}

/** Partners (SOCIO), the users an admin can assign parkings to. */
async function listPartners() {
    const { User } = getModels();
    const users = await User.findAll({ where: { role: ROLES.SOCIO }, order: [['id', 'ASC']] });
    return users.map(toUserResponse);
}

/**
 * Updates username, email, password (optional) and role. A partner that still owns parkings
 * cannot stop being SOCIO, and an admin cannot change their own role (no lock-out).
 */
async function updateUser(id, changes, actor) {
    const { User, Parking } = getModels();
    const user = await User.findByPk(id);
    if (!user) throw notFound(`No se encontró un usuario con el id ${id}`);

    await ensureUnique(changes, user.id);

    if (changes.role && changes.role !== user.role) {
        if (actor && actor.id === user.id) {
            throw conflict('No puede cambiar su propio rol');
        }
        if (user.role === ROLES.SOCIO && (await Parking.count({ where: { id_partner: user.id } })) > 0) {
            throw conflict('El socio tiene parqueaderos asignados; reasígnelos antes de cambiar su rol');
        }
    }

    const values = {};
    for (const key of ['username', 'email', 'role']) {
        if (changes[key] !== undefined) values[key] = changes[key];
    }
    if (changes.password) values.password = await hashPassword(changes.password);
    await user.update(values);
    return toUserResponse(user);
}

async function findUserById(id) {
    const { User } = getModels();
    return User.findByPk(id);
}

/** Case-insensitive, with the password hash (login only). */
async function findUserForLogin(email) {
    const { User } = getModels();
    return User.scope('withPassword').findOne({ where: sameText('email', email) });
}

/** Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD when missing. Never changes an existing user. */
async function seedAdmin() {
    const { admin } = getConfig();
    if (!admin.email) return false;
    if (!admin.password) throw new Error('ADMIN_PASSWORD must be set when ADMIN_EMAIL is set');
    const { User } = getModels();
    if (await User.findOne({ where: sameText('email', admin.email) })) return false;
    let username = admin.username;
    if (await User.findOne({ where: sameText('username', username) })) username = `${username}_${Date.now()}`;
    await User.create({ username, email: admin.email, password: await hashPassword(admin.password), role: ROLES.ADMIN });
    logger.info('Admin user created');
    return true;
}

module.exports = { createUser, listPartners, updateUser, findUserById, findUserForLogin, seedAdmin, toUserResponse, hashPassword };
