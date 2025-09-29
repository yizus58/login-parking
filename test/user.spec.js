const request = require('supertest');
const express = require('express');
const userRoute = require('../routes/userRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/users', userRoute);

let auth;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(true);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

test('POST Create User', async () => {
    const uniqueId = Date.now();
    const response = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${auth.token}`)
        .send({
            username: `JDoe_${uniqueId}`,
            email: `user_${uniqueId}@mail.com`,
            password: "12345678",
            role: "SOCIO"
        });

    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(typeof response.body.data).toBe('object');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('username');
    expect(response.body.data).toHaveProperty('email');
    expect(response.body.data).toHaveProperty('role');

});

test('GET All Users', async () => {
    const response = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${auth.token}`);

    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0]).toHaveProperty('id');
    expect(response.body.data[0]).toHaveProperty('username');
    expect(response.body.data[0]).toHaveProperty('email');
    expect(response.body.data[0]).toHaveProperty('role');
});
