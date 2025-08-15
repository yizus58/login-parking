const request = require('supertest');
const authRoutes = require('../routes/authRoutes');
const express = require("express");
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Vehicle = require("../models/Vehicle");
const Parking = require("../models/Parking");

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let mail = process.env.ADMIN_EMAIL;
let pass = process.env.ADMIN_PASSWORD;

let token = null;

async function getToken(admin = true) {
    if (!token) {
        if (!admin) {
            console.log('No admin token found. Creating one...');
            mail = process.env.TEST_USER_EMAIL;
            pass = process.env.TEST_USER_PASSWORD;
            await createTestUser();
        }

        const response = await request(app)
            .post('/api/auth/')
            .send({ email: mail, password: pass });
        token = response.body.token;
    }
    return token;
}

const createUser = async (mail, pass, rol= 'ADMIN') => {
    await User.sequelize.sync();
    const username = rol === 'ADMIN'? 'admin' : 'jdoe';

    const findUser = await User.findOne({ where: { email: mail } });
    if (!findUser) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);
        const save = await User.create({
            username: username,
            email: mail,
            password: hashedPassword,
            role: rol
        });
        const id = save.id;
        console.log(`User ${mail} created with ID: ${id}`);
    }
}

const createTestUser = async () => {
    console.log('Creating test user...');
    await createUser(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD, 'SOCIO');
}


const findUsers = async (id) => {
    const findParkingSpace = await Parking.findByPk(id);
    if (!findParkingSpace) {
        throw new Error('Parking space not found');
    }
    console.log('Parking space found:', findParkingSpace.dataValues);
}

module.exports = { getToken, createUser, findUsers };