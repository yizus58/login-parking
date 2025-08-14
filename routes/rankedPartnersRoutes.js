const { Router } = require('express');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getTopPartnersCurrentWeek } = require("../controllers/vehiclesLog");
const router = Router();

router.get('/', validateJWT, getTopPartnersCurrentWeek); // Top 3 socios con mayor entrada

module.exports = router;
