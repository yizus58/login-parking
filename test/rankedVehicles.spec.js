const request = require('supertest');
const http = require('http');
const Server = require('../models/server');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth } = require('../utils/testUtils');

const server = new Server();
const app = http.createServer(server.app);

let auth;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(app, true);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
        app.close();
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