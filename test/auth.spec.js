const request = require('supertest');
const Server = require('../models/server');
const { connectToDatabase, sequelize} = require('../config/database');
const { getAuth } = require("../utils/testUtils");

const server = new Server();
const app = server.app;

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
        auth = await getAuth(true, app);
    });

    test('POST /login with correct credentials', async () => {
        const user = {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
        };

        const response = await request(app)
            .post('/api/auth/login')
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
            .post('/api/auth/login')
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