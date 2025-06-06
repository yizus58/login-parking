const { Router } = require('express');
const { validateParking, validateUpdateParking, validateIdParking, validateEarningPeriod } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { createParking, updateParking, getAllParkings, getParkingById, getParkingByUser, getDetailParking, removeParking } = require("../controllers/parking");
const { getEarningsByPeriod, getTopVehicles, getTopPartnersCurrentWeek, getTopParkingsEarningsCurrentWeek, getTopVehiclesByParking, getFirstTimeParkedVehicles } = require("../controllers/vehiclesLog");
const router = Router();


// routes admin
router.post('/create_parking', ...validateParking, validateJWT,createParking);
router.post('/update_parking', ...validateUpdateParking, validateJWT, updateParking);

router.get('/all_parking', validateJWT, getAllParkings);
router.get('/get_parking', ...validateIdParking, validateJWT, getParkingById);

router.get('/top_parkings_earnings_current_week', validateJWT, getTopParkingsEarningsCurrentWeek);
router.get('/top_partners_current_week', validateJWT, getTopPartnersCurrentWeek);

router.delete('/remove_parking', ...validateIdParking, validateJWT, removeParking);


// routes users
router.get('/get_parking_user/', validateJWT, getParkingByUser);
router.get('/get_details_parking', ...validateIdParking, validateJWT, getDetailParking);
router.get('/earnings_by_period', ...validateEarningPeriod, getEarningsByPeriod);

// routes admin and users
router.get('/first_time_parked_vehicles', validateJWT, getFirstTimeParkedVehicles);
router.get('/top_vehicles', validateJWT, getTopVehicles);
router.get('/top_vehicles_by_parking', validateJWT, getTopVehiclesByParking);


module.exports = router;
