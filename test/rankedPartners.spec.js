const request = require('supertest');
const express = require('express');
const rankedPartnersRoute = require('../routes/rankedPartnersRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/ranked-partners', rankedPartnersRoute);

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken();
});

test('GET Get Ranked Partners', async () => {
    const response = await request(app)
        .get('/api/ranked-partners/')
        .set('Authorization', `Bearer ${global.token}`);

    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('week_start');
    expect(response.body.data).toHaveProperty('week_end');
    expect(response.body.data).toHaveProperty('top_partners');
    expect(Array.isArray(response.body.data.top_partners)).toBe(true);
    expect(response.body.data.top_partners.length).toBeGreaterThanOrEqual(0);

    expect(new Date(response.body.data.week_start)).toBeInstanceOf(Date);
    expect(new Date(response.body.data.week_end)).toBeInstanceOf(Date);

    if (response.body.data.top_partners.length > 0) {
        const firstParking = response.body.data.top_partners[0];
        expect(firstParking).toHaveProperty('partner_name');
        expect(firstParking).toHaveProperty('vehicle_count');
        expect(typeof firstParking.vehicle_count).toBe('string');
    }
});
