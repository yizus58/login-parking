const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const { connectToDatabase, sequelize } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    await connectToDatabase();
    await createUser();
});

const createUser = async () => {
    await User.sequelize.sync();

    const mail = process.env.ADMIN_EMAIL;
    const admin = await User.findOne({ where: { email: mail } });
    if (!admin) {
        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);
        await User.create({
            username: 'admin',
            email: mail,
            password: hashedPassword,
            role: 'ADMIN'
        });
    }
};

test('POST /login', async () => {
    const user = {
        email: 'admin@mail.com',
        password: 'admin',
    };

    const response = await request(app)
        .post('/api/auth/')
        .send(user)
        .expect(200);

    global.token = response.body.token;

    expect(response.body).toHaveProperty('token');
}, 10000);

test('GET /renew token', async () => {
    const response = await request(app)
       .get('/api/auth/renew')
       .set('Authorization', `Bearer ${global.token}`)
       .expect(200);
    global.token = response.body.token;

    expect(response.body).toHaveProperty('token');
});
