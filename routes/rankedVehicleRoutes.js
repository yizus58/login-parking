const { Router } = require('express');
const { validateIdParams } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getTopVehicles, getTopVehiclesByParking } = require("../controllers/vehiclesLog");
const router = Router();

router.get('/', validateJWT, getTopVehicles);
router.get('/:id', ...validateIdParams, validateJWT, getTopVehiclesByParking);


module.exports = router;