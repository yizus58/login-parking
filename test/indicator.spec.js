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

test('GET First Time Parking', async () => {

    const response = await request(app)
        .get('/api/indicators/')
        .set('Authorization', `Bearer ${auth.token}`);

    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
});