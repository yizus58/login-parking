'use strict';

const { Router } = require('express');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { validate } = require('../middlewares/validate');
const { ROLES } = require('../models/roles');
const authValidators = require('../validators/auth.validators');
const userValidators = require('../validators/user.validators');
const parkingValidators = require('../validators/parking.validators');
const vehicleValidators = require('../validators/vehicle.validators');
const detailValidators = require('../validators/detail.validators');
const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const parkings = require('../controllers/parking.controller');
const vehicles = require('../controllers/vehicle.controller');
const details = require('../controllers/detail.controller');
const rankings = require('../controllers/ranking.controller');

const { ADMIN, SOCIO } = ROLES;
const admin = [authenticate, authorize(ADMIN)];
const partner = [authenticate, authorize(SOCIO)];
const anyRole = [authenticate, authorize(ADMIN, SOCIO)];

function authRoutes() {
    const router = Router();
    router.post('/login', validate(authValidators.login), auth.login);
    router.get('/renew', authenticate, auth.renew);
    return router;
}

function userRoutes() {
    const router = Router();
    router.use(admin);
    router.post('/', validate(userValidators.create), users.create);
    router.get('/', users.list);
    router.put('/:id', validate(userValidators.update), users.update);
    return router;
}

function parkingRoutes() {
    const router = Router();
    router.post('/', admin, validate(parkingValidators.create), parkings.create);
    router.put('/:id', admin, validate(parkingValidators.update), parkings.update);
    router.delete('/:id', admin, validate(parkingValidators.byId), parkings.remove);
    router.get('/', anyRole, parkings.list);
    router.get('/:id', anyRole, validate(parkingValidators.byId), parkings.getById);
    return router;
}

function vehicleRoutes() {
    const router = Router();
    router.use(partner);
    router.post('/', validate(vehicleValidators.entry), vehicles.entry);
    router.put('/', validate(vehicleValidators.exit), vehicles.exit);
    return router;
}

function detailRoutes() {
    const router = Router();
    router.get('/', partner, validate(detailValidators.earnings), details.earnings);
    router.delete('/excel', admin, validate(detailValidators.removeExcel), details.removeExcel);
    router.get('/:id', partner, validate(detailValidators.byId), details.parkingDetail);
    router.get('/:id/excel', anyRole, validate(detailValidators.excel), details.excel);
    return router;
}

function rankingRoutes() {
    const indicators = Router().get('/', anyRole, rankings.firstTimeVehicles);
    const partners = Router().get('/', admin, rankings.topPartners);
    const parkingsRanking = Router().get('/', admin, rankings.topParkings);
    const vehiclesRanking = Router()
        .get('/', admin, rankings.topVehicles)
        .get('/:id', anyRole, validate(parkingValidators.byId), rankings.topVehiclesByParking);
    return { indicators, partners, parkingsRanking, vehiclesRanking };
}

/** Every API route, on the same paths as before. */
function apiRouter() {
    const router = Router();
    const ranking = rankingRoutes();
    router.use('/auth', authRoutes());
    router.use('/users', userRoutes());
    router.use('/parking', parkingRoutes());
    router.use('/vehicles', vehicleRoutes());
    router.use('/details', detailRoutes());
    router.use('/indicators', ranking.indicators);
    router.use('/ranked-partners', ranking.partners);
    router.use('/ranked-parkings', ranking.parkingsRanking);
    router.use('/ranked-vehicles', ranking.vehiclesRanking);
    return router;
}

module.exports = { apiRouter };
