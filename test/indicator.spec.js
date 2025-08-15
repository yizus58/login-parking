const request = require('supertest');
const express = require('express');
const indicatorRoute = require('../routes/indicatorRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/indicators', indicatorRoute);

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken();
});


test('GET First Time Parking', async () => {

    const response = await request(app)
        .get('/api/indicators/')
        .set('Authorization', `Bearer ${global.token}`);

    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
});

