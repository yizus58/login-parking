const request = require('supertest');
const express = require('express');
const userRoute = require('../routes/userRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/users', userRoute);

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken();
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

test('POST Create User', async () => {
    const response = await request(app)
        .post('/api/users/')
        .set('Authorization', `Bearer ${global.token}`)
        .send({
            username: "JDoe",
            email: "user@mail.com",
            password: "12345678"
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
        .set('Authorization', `Bearer ${global.token}`);

    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    expect(response.body.data[0]).toHaveProperty('id');
    expect(response.body.data[0]).toHaveProperty('username');
    expect(response.body.data[0]).toHaveProperty('email');
    expect(response.body.data[0]).toHaveProperty('role');
});
