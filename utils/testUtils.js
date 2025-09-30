require('../models/associations');
const request = require('supertest');
const authRoutes = require('../routes/authRoutes');
const express = require("express");
const User = require('../models/User');
const Parking = require('../models/Parking');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

async function getAuth(admin = true) {
    const email = admin ? process.env.ADMIN_EMAIL : process.env.TEST_USER_EMAIL;
    const password = admin ? process.env.ADMIN_PASSWORD : process.env.TEST_USER_PASSWORD;
    const role = admin ? 'ADMIN' : 'SOCIO';

    const user = await createUser(email, password, role);

    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    const token = response.body.token;

    return { token, user };
}

const createUser = async (mail, pass, rol = 'ADMIN') => {

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(pass, salt);
    
    const where = rol === 'ADMIN' ? { username: 'admin' } : { email: mail };
    const defaults = {
        username: rol === 'ADMIN' ? 'admin' : `jdoe_${Date.now()}`,
        email: mail,
        password: hashedPassword,
        role: rol
    };

    const [user, created] = await User.findOrCreate({ where, defaults });

    if (!created) {
        user.password = hashedPassword;
        user.role = rol;
        user.email = mail;
        await user.save();
    }

    await user.reload();
    return user;
};

const createParking = async (partnerId) => {
    const parking = await Parking.create({
        name: `Test Parking ${Date.now()}`,
        address: "123 Test St",
        capacity: 100,
        cost_per_hour: 10,
        id_partner: partnerId
    });
    return parking;
}

module.exports = { getAuth, createUser, createParking };