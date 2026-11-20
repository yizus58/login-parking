'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { unauthorized } = require('../utils/errors');
const { signToken } = require('./token.service');
const { findUserForLogin, toUserResponse } = require('./user.service');

const INVALID_CREDENTIALS = 'Credenciales inválidas';

let dummyHash;
/** Compared when the email is unknown, so both failures take as long. */
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync(randomUUID(), 10));

/** Unknown email and wrong password get the same 401, so emails cannot be enumerated. */
async function login(email, password) {
    const user = await findUserForLogin(email);
    const matches = await bcrypt.compare(String(password), user?.password ?? getDummyHash());
    if (!user || !matches) throw unauthorized(INVALID_CREDENTIALS);
    return { token: signToken(user.id), data: toUserResponse(user) };
}

/** A fresh token for the authenticated user. */
function renew(user) {
    return { token: signToken(user.id), data: toUserResponse(user) };
}

module.exports = { login, renew, INVALID_CREDENTIALS };
