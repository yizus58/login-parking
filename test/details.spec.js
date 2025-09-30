const request = require('supertest');
const http = require('http');
const Server = require('../models/server');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth, createParking } = require('../utils/testUtils');

const server = new Server();
const app = http.createServer(server.app);

let auth;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(app, false);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
        app.close();
    }
});

describe('Details API', () => {
    let testParking;

    beforeEach(async () => {
        testParking = await createParking(auth.user.id);
    });

    test('GET Earnings By Period', async () => {
        const data = {
            id_parking: testParking.id,
            start_date: '10-08-2025',
            end_date: '25-08-2025'
        };

        const response = await request(app)
            .get('/api/details/')
            .query(data)
            .set('Authorization', `Bearer ${auth.token}`);

        expect(response.body.result).toBe(true);
    });

    test('GET Details By ID', async () => {
        const response = await request(app)
            .get(`/api/details/${testParking.id}`)
            .set('Authorization', `Bearer ${auth.token}`);

        expect(response.body.result).toBe(true);
    });
});