const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const { connectToDatabase } = require('../config/database');
const { createUser } = require("../utils/testUtils");

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
    await connectToDatabase();
    await createUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
});

test('POST /login', async () => {
    const user = {
        email: 'admin@mail.com',
        password: 'admin',
    };

    const response = await request(app)
        .post('/api/auth/')
        .send(user)
        .expect(200);

    global.token = response.body.token;

    expect(response.body).toHaveProperty('token');
}, 10000);

test('GET /renew token', async () => {
    const response = await request(app)
       .get('/api/auth/renew')
       .set('Authorization', `Bearer ${global.token}`)
       .expect(200);
    global.tokenAdmin = response.body.token;

    expect(response.body).toHaveProperty('token');
});
