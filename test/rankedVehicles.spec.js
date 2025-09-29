const request = require('supertest');
const express = require('express');
const rankedVehiclesRoute = require('../routes/rankedVehicleRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/ranked-vehicles', rankedVehiclesRoute);

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


test('GET Get Ranked Vehicles', async () => {
    const response = await request(app)
        .get('/api/ranked-vehicles/')
        .set('Authorization', `Bearer ${auth.token}`);

    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    if (response.body.data.length > 0) {
        const firstRanking = response.body.data[0];
        expect(firstRanking).toHaveProperty('plate_number');
        expect(firstRanking).toHaveProperty('total_visits');

        expect(typeof firstRanking.plate_number).toBe('string');
        expect(typeof firstRanking.total_visits).toBe('number');
    }
});
