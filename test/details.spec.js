const request = require('supertest');
const express = require('express');
const detailsRoute = require('../routes/detailRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken, getTokenUser } =require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/details', detailsRoute);

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken();
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});


test('GET Earnings By Period', async () => {
    const data = {
        id_parking: 1,
        start_date: '10-08-2025',
        end_date: '25-08-2025'
    };

    const response = await request(app)
        .get('/api/details/')
        .send(data)
        .set('Authorization', `Bearer ${global.token}`);

   expect(response.body.result).toBe(true);
});

test(' GET Details By ID', async () => {
    let token = await getTokenUser(false);
    const response = await request(app)
        .get('/api/details/1')
        .set('Authorization', `Bearer ${token}`);

   expect(response.body.result).toBe(true);
});

