const { Router } = require('express');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getFirstTimeParkedVehicles} = require("../controllers/vehiclesLog");
const router = Router();

router.get('/', validateJWT, getFirstTimeParkedVehicles);

module.exports = router;