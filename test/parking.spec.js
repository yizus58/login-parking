const request = require('supertest');
const Server = require('../models/server');
const { connectToDatabase, sequelize } = require('../config/database');
const { getAuth, createUser } = require('../utils/testUtils');

const server = new Server();
const app = server.app;

let adminAuth;
let partnerUser;

beforeAll(async () => {
    await connectToDatabase();
    adminAuth = await getAuth(true, app);
    partnerUser = await createUser(app,`partner_${Date.now()}@test.com`, 'password', 'SOCIO');
});

afterAll(async () => {
    if (sequelize && sequelize.close) {
        await sequelize.close();
    }
});

describe('Parking API', () => {

    test('POST Create Parking Space', async () => {
        const response = await request(app)
            .post('/api/parking/')
            .set('Authorization', `Bearer ${adminAuth.token}`)
            .send({
                name: "Parqueadero Test Create",
                address: "av 5 #36-23",
                capacity: 200,
                id_partner: partnerUser.id,
                cost: 25000
            });

        expect(response.body.result).toBe(true);
        expect(response.body.data).toHaveProperty('id');
    });

    test('GET All Parkings', async () => {
        const response = await request(app)
            .get('/api/parking/')
            .set('Authorization', `Bearer ${adminAuth.token}`);
        expect(response.body.result).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    describe('operations on a single parking space', () => {
        let testParking;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/parking/')
                .set('Authorization', `Bearer ${adminAuth.token}`)
                .send({ name: "Test Parking Instance", address: "123 Main St", capacity: 50, id_partner: partnerUser.id, cost: 15000 });
            testParking = response.body.data;
        });

        test('GET Parking Space by ID', async () => {
            const response = await request(app)
                .get(`/api/parking/${testParking.id}`)
                .set('Authorization', `Bearer ${adminAuth.token}`);
            expect(response.body.result).toBe(true);
            expect(response.body.data[0].id).toBe(testParking.id);
        });

        test('PUT Update Parking Space', async () => {
            const response = await request(app)
                .put(`/api/parking/${testParking.id}`)
                .set('Authorization', `Bearer ${adminAuth.token}`)
                .send({
                    name: "Parqueadero Updated",
                    address: "av 5 #36-23",
                    capacity: 25,
                    id_partner: partnerUser.id,
                    cost: 40000
                });

            expect(response.body.result).toBe(true);
            expect(response.body.msg).toBe('Parqueadero actualizado correctamente');
        });

        test('DELETE Parking Space', async () => {
            const response = await request(app)
                .delete(`/api/parking/${testParking.id}`)
                .set('Authorization', `Bearer ${adminAuth.token}`);

            expect(response.body.result).toBe(true);
            expect(response.body.msg).toBe('Parqueadero eliminado correctamente');
        });
    });
});