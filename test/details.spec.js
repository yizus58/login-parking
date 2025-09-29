const request = require('supertest');
const express = require('express');
const detailsRoute = require('../routes/detailRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth, createParking } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/details', detailsRoute);

let auth;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(false);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
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
