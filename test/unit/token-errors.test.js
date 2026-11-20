'use strict';

const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../../src/services/token.service');
const { getConfig } = require('../../src/config/env');
const { AppError, badRequest, unauthorized, forbidden, notFound, conflict } = require('../../src/utils/errors');

describe('token service', () => {
    it('signs and verifies HS256 tokens with an expiry', () => {
        const token = signToken(7);
        expect(verifyToken(token)).toBe(7);
        const decoded = jwt.decode(token, { complete: true });
        expect(decoded.header.alg).toBe('HS256');
        expect(decoded.payload.exp - decoded.payload.iat).toBe(6 * 3600);
    });

    it('rejects tampered, expired, foreign and malformed tokens', () => {
        const key = getConfig().auth.jwtKey;
        expect(verifyToken(signToken(7) + 'x')).toBeNull();
        expect(verifyToken(jwt.sign({ uid: 7 }, key, { expiresIn: -10 }))).toBeNull();
        expect(verifyToken(jwt.sign({ uid: 7 }, 'another-key-another-key-another-key'))).toBeNull();
        expect(verifyToken(jwt.sign({ uid: '7' }, key))).toBeNull();
        expect(verifyToken(jwt.sign({ uid: 7 }, key, { algorithm: 'HS512' }))).toBeNull();
        expect(verifyToken('garbage')).toBeNull();
    });
});

describe('errors', () => {
    it('carry the HTTP status', () => {
        expect(badRequest('a', [1])).toMatchObject({ status: 400, message: 'a', details: [1] });
        expect(unauthorized()).toMatchObject({ status: 401 });
        expect(forbidden()).toMatchObject({ status: 403 });
        expect(notFound('x')).toMatchObject({ status: 404 });
        expect(conflict('x')).toMatchObject({ status: 409 });
        expect(new AppError(418, 'tea')).toBeInstanceOf(Error);
    });
});
