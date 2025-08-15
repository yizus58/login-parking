const request = require('supertest');
const express = require('express');
const vehicleRoute = require('../routes/vehicleRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/vehicles', vehicleRoute);

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken(false);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

test('POST Entry Vehicle', async () => {
    const response = await request(app)
       .post('/api/vehicles/')
       .set('Authorization', `Bearer ${global.token}`)
       .send({
           model_vehicle : "Mitsubishi Carisma",
           vehicle_plate: "POS-000",
           id_parking: 2
        });

    expect(response.status).toBe(201);
    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');

    const rd = response.body.data;
    expect(rd).toHaveProperty('id');
    expect(rd).toHaveProperty('id_parking');
    expect(rd).toHaveProperty('plate_number');
    expect(rd).toHaveProperty('model_vehicle');
    expect(rd).toHaveProperty('status');
});

test('PUT Exit Vehicle', async () => {
   const response = await request(app)
       .put('/api/vehicles/')
       .set('Authorization', `Bearer ${global.token}`)
       .send({
           vehicle_plate: "POS-000",
           id_parking: 2
       });
    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty('data');

    const rd = response.body.data;
    expect(rd).toHaveProperty('id');
    expect(rd).toHaveProperty('plate_number');
    expect(rd).toHaveProperty('model_vehicle');
    expect(rd).toHaveProperty('entry_time');
    expect(rd).toHaveProperty('exit_time');
    expect(rd).toHaveProperty('cost_per_hour');
    expect(rd).toHaveProperty('status');
    expect(rd).toHaveProperty('total_cost');
});
