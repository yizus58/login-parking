const { Router } = require('express');
const { validateEarningPeriod, validateIdParams } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getDetailParking } = require("../controllers/parking");
const { getEarningsByPeriod } = require("../controllers/vehiclesLog");
const { generateExcel } = require("../controllers/excel");

const router = Router();

router.get('/:id', ...validateIdParams, validateJWT, getDetailParking);
router.get('/', ...validateEarningPeriod, getEarningsByPeriod);
router.get('/:id/excel', ...validateIdParams, validateJWT, generateExcel);

module.exports = router;