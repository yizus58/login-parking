const request = require('supertest');
const express = require('express');
const vehicleRoute = require('../routes/vehicleRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth, createParking } = require('../utils/testUtils');

const app = express();
app.use(express.json());
app.use('/api/vehicles', vehicleRoute);

let auth;
let testParking;

const uniquePart = Date.now().toString().slice(-3);
const rawPlate = `TST${uniquePart}`;
const formattedPlate = `TST-${uniquePart}`;

beforeAll(async () => {
    await connectToDatabase();
    auth = await getAuth(false);
    testParking = await createParking(auth.user.id);
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

test('Vehicle should enter and then exit successfully', async () => {
    const entryResponse = await request(app)
       .post('/api/vehicles/')
       .set('Authorization', `Bearer ${auth.token}`)
       .send({
           model_vehicle : "Mitsubishi Carisma",
           vehicle_plate: rawPlate,
           id_parking: testParking.id
        });

    expect(entryResponse.status).toBe(201);
    expect(entryResponse.body.result).toBe(true);
    const entryData = entryResponse.body.data;
    expect(entryData.plate_number).toBe(formattedPlate);
    expect(entryData.status).toBe('IN');

    const exitResponse = await request(app)
       .put('/api/vehicles/')
       .set('Authorization', `Bearer ${auth.token}`)
       .send({
           vehicle_plate: rawPlate,
           id_parking: testParking.id
       });

    expect(exitResponse.status).toBe(200);
    expect(exitResponse.body.result).toBe(true);
    const exitData = exitResponse.body.data;
    expect(exitData.plate_number).toBe(formattedPlate);
    expect(exitData.status).toBe('OUT');
    expect(exitData).toHaveProperty('total_cost');
});
