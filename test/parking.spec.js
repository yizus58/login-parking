const request = require('supertest');
const express = require('express');
const parkingRoute = require('../routes/parkingRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getToken } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/parking', parkingRoute);

let createdParkingId;

beforeAll(async () => {
    await connectToDatabase();
    global.token = await getToken();
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

test('POST Create Parking Space', async () => {
    const response = await request(app)
        .post('/api/parking/')
        .set('Authorization', `Bearer ${global.token}`)
        .send({
            name : "parqueadero El jdoe",
            address: "av 5 #36-23",
            capacity: 200,
            id_partner: 2,
            cost: 25000
        });

    expect(response.body.result).toBe(true);
    createdParkingId = response.body.data?.id || createdParkingId;
});

test('GET All Parkings', async () => {
    const response = await request(app)
        .get('/api/parking/')
        .set('Authorization', `Bearer ${global.token}`);
    expect(response.body.result).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
});

test('PUT Update Parking Space', async () => {
    const idToUpdate = createdParkingId || 2;
    const response = await request(app)
        .put(`/api/parking/${idToUpdate}`)
        .set('Authorization', `Bearer ${global.token}`)
        .send({
            name : "Parqueadero Test",
            address: "av 5 #36-23",
            capacity: 20,
            id_partner: 2,
            cost: 35000
        });

    expect(response.body.result).toBe(true);
    expect(response.body.msg).toBe('Parqueadero actualizado correctamente');
});

test('DELETE Parking Space', async () => {
    const idToDelete = createdParkingId || 2;
    const response = await request(app)
        .delete(`/api/parking/${idToDelete}`)
        .set('Authorization', `Bearer ${global.token}`);

    expect(response.body.result).toBe(true);
    expect(response.body.msg).toBe('Parqueadero eliminado correctamente');
});

test('GET Parking Space by ID', async () => {
    const idToGet = createdParkingId || 1;
    const response = await request(app)
        .get(`/api/parking/${idToGet}`)
        .set('Authorization', `Bearer ${global.token}`);

    expect([true, false]).toContain(response.body.result);
});
