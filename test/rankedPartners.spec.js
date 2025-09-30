const request = require('supertest');
const Server = require('../models/server');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth } = require('../utils/testUtils');

const server = new Server();
const app = server.app;

let auth;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(true, app);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});


test('GET Get Ranked Partners', async () => {
    const response = await request(app)
        .get('/api/ranked-partners/')
        .set('Authorization', `Bearer ${auth.token}`);

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