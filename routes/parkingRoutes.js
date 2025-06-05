const { Router } = require('express');
const { validateParking, validateIdParking } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { createParking, updateParking, getAllParkings, getParkingById, removeParking } = require("../controllers/parking");
const router = Router();

router.post('/create_parking', ...validateParking, validateJWT,createParking);

router.post('/update_parking', ...validateParking, validateJWT, updateParking);

router.get('/all_parking', validateJWT, getAllParkings);
router.get('/get_parking', ...validateIdParking, validateJWT, getParkingById);

router.delete('/remove_parking', ...validateIdParking, validateJWT, removeParking);

module.exports = router;