require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('../config/database');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.usuariosPath = '/api/usuarios';

        this.middlewares();
        this.routes();
    }

    middlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.usuariosPath, require('../routes/authRoutes'));
    }

    async start() {
        try {
            await connectToDatabase();
            this.app.listen(this.port, () => {
                console.log(`Server is running on port ${this.port}`);
            });
        } catch (err) {
            console.error('Error al sincronizar la base de datos:', err);
        }
    }
}

module.exports = Server;