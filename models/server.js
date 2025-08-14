require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('../config/database');
require('../models/associations');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.authPath = '/api/auth';
        this.detailsPath = '/api/details';
        this.emailPath = '/api/emails';
        this.indicatorsPath = '/api/indicators';
        this.rankedPartnersPath = '/api/ranked-partners';
        this.rankedParkingsPath = '/api/ranked-parkings';
        this.rankedVehiclesPath = '/api/ranked-vehicles';
        this.parkingPath = '/api/parking';
        this.usersPath = '/api/users';
        this.vehiclesPath = '/api/vehicles';

        this.middlewares();
        this.routes();
    }

    middlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.authPath, require('../routes/authRoutes'));
        this.app.use(this.detailsPath, require('../routes/detailRoutes'));
        this.app.use(this.emailPath, require('../routes/emailRoutes'));
        this.app.use(this.indicatorsPath, require('../routes/indicatorRoutes'));
        this.app.use(this.rankedPartnersPath, require('../routes/rankedPartnersRoutes'));
        this.app.use(this.rankedParkingsPath, require('../routes/rankedParkingsRoutes'));
        this.app.use(this.rankedVehiclesPath, require('../routes/rankedVehicleRoutes'));
        this.app.use(this.parkingPath, require('../routes/parkingRoutes'));
        this.app.use(this.usersPath, require('../routes/userRoutes'));
        this.app.use(this.vehiclesPath, require('../routes/vehicleRoutes'));
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