const { Router } = require('express');
const { validateVehicle, validateVehiclePlate } = require('../middlewares/validateVehicle');
const { validateJWT } = require('../middlewares/validate-jwt');
const { EntryVehicle, ExitVehicle } = require("../controllers/vehiclesLog");
const router = Router();

router.post('/', ...validateVehicle, validateJWT, EntryVehicle);
router.put('/', ...validateVehiclePlate, validateJWT, ExitVehicle);

module.exports = router;