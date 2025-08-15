const request = require('supertest');
const authRoutes = require('../routes/authRoutes');
const express = require("express");

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
const mail = process.env.ADMIN_EMAIL;
const pass = process.env.ADMIN_PASSWORD;

let token = null;

async function getToken() {
    if (!token) {
        const response = await request(app)
            .post('/api/auth/')
            .send({ email: mail, password: pass });
        token = response.body.token;
    }
    return token;
}

module.exports = { getToken };