const { Router } = require('express');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getTopParkingsEarningsCurrentWeek } = require("../controllers/vehiclesLog");
const router = Router();

router.get('/', validateJWT, getTopParkingsEarningsCurrentWeek); // Top 3 de parqueaderos con mayor ganancia

module.exports = router;