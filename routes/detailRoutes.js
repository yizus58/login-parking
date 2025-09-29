const { Router } = require('express');
const { validateEarningPeriod, validateIdParams } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getDetailParking } = require("../controllers/parking");
const { getEarningsByPeriod } = require("../controllers/vehiclesLog");
const { generateExcel, removeExcelS3 } = require("../controllers/reportExcel");

const router = Router();

router.get('/:id', ...validateIdParams, validateJWT, getDetailParking);
router.get('/', ...validateEarningPeriod, validateJWT, getEarningsByPeriod);
router.get('/:id/excel', ...validateIdParams, validateJWT, generateExcel);
router.delete('/excel', validateJWT, removeExcelS3);

module.exports = router;