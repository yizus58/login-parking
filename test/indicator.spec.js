const request = require('supertest');
const express = require('express');
const indicatorRoute = require('../routes/indicatorRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/indicators', indicatorRoute);

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

test('GET First Time Parking', async () => {

    const response = await request(app)
        .get('/api/indicators/')
        .set('Authorization', `Bearer ${auth.token}`);

    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
});
