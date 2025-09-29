const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const { connectToDatabase, sequelize} = require('../config/database');
const { getAuth } = require("../utils/testUtils");

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
    await connectToDatabase();
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

describe('Auth API', () => {
    let auth;

    beforeAll(async () => {
        auth = await getAuth(true);
    });

    test('POST /login with correct credentials', async () => {
        const user = {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
        };

        const response = await request(app)
            .post('/api/auth/')
            .send(user)
            .expect(200);

        expect(response.body.result).toBe(true);
        expect(response.body).toHaveProperty('token');
        expect(response.body.data.email).toBe(process.env.ADMIN_EMAIL);
    });

    test('POST /login with incorrect credentials', async () => {
        const user = {
            email: process.env.ADMIN_EMAIL,
            password: 'wrongpassword',
        };

        const response = await request(app)
            .post('/api/auth/')
            .send(user)
            .expect(404);

        expect(response.body.result).toBe(false);
    });

    test('GET /renew token', async () => {
        const response = await request(app)
           .get('/api/auth/renew')
           .set('Authorization', `Bearer ${auth.token}`)
           .expect(200);

        expect(response.body.result).toBe(true);
        expect(response.body).toHaveProperty('token');
        expect(response.body.data.email).toBe(process.env.ADMIN_EMAIL);
    });
});
