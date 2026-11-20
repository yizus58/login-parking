'use strict';

jest.mock('../../src/services/user.service', () => ({ findUserById: jest.fn() }));

const express = require('express');
const request = require('supertest');
const { authenticate } = require('../../src/middlewares/authenticate');
const { errorHandler } = require('../../src/middlewares/error-handler');
const { signToken } = require('../../src/services/token.service');
const { findUserById } = require('../../src/services/user.service');

const app = express();
app.get('/me', authenticate, (req, res) => res.json(req.user));
app.use(errorHandler);

describe('authenticate', () => {
    beforeEach(() => findUserById.mockReset());

    it('loads the user of a valid token (Bearer or bare)', async () => {
        findUserById.mockResolvedValue({ id: 5, role: 'SOCIO' });
        expect((await request(app).get('/me').set('Authorization', `Bearer ${signToken(5)}`)).body).toEqual({ id: 5, role: 'SOCIO' });
        expect((await request(app).get('/me').set('Authorization', signToken(5))).status).toBe(200);
        expect(findUserById).toHaveBeenCalledWith(5);
    });

    it('answers 401 without token, with a bad token or for a deleted user', async () => {
        expect((await request(app).get('/me')).body).toEqual({ result: false, msg: 'No hay token en la peticion' });
        expect((await request(app).get('/me').set('Authorization', 'Bearer nope')).body).toEqual({ result: false, msg: 'Token no valido' });
        expect(findUserById).not.toHaveBeenCalled();
        findUserById.mockResolvedValue(null);
        expect((await request(app).get('/me').set('Authorization', `Bearer ${signToken(9)}`)).status).toBe(401);
    });
});
