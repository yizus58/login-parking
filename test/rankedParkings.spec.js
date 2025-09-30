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

test('GET Get Ranked Parking Space', async () => {
    const response = await request(app)
        .get('/api/ranked-parkings/')
        .set('Authorization', `Bearer ${auth.token}`);

    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('week_start');
    expect(response.body.data).toHaveProperty('week_end');
    expect(response.body.data).toHaveProperty('top_parkings');
    expect(Array.isArray(response.body.data.top_parkings)).toBe(true);
    expect(response.body.data.top_parkings.length).toBeGreaterThanOrEqual(0);

    expect(new Date(response.body.data.week_start)).toBeInstanceOf(Date);
    expect(new Date(response.body.data.week_end)).toBeInstanceOf(Date);

    if (response.body.data.top_parkings.length > 0) {
        const firstParking = response.body.data.top_parkings[0];
        expect(firstParking).toHaveProperty('id');
        expect(firstParking).toHaveProperty('name');
        expect(firstParking).toHaveProperty('total_earnings');
        expect(firstParking).toHaveProperty('vehicle_count');
        expect(typeof firstParking.total_earnings).toBe('number');
        expect(typeof firstParking.vehicle_count).toBe('number');
    }
});