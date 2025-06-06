const { Router } = require('express');
const { validateVehicle, validateVehiclePlate } = require('../middlewares/validateVehicle');
const { validateJWT } = require('../middlewares/validate-jwt');
const { EntryVehicle, ExitVehicle } = require("../controllers/vehiclesLog");
const router = Router();

router.post('/entry_vehicle', ...validateVehicle, validateJWT, EntryVehicle);
router.post('/exit_vehicle', ...validateVehiclePlate, validateJWT, ExitVehicle);

module.exports = router;