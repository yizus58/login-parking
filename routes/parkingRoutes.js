const { Router } = require('express');
const { validateParking, validateUpdateParking, validateIdParams } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { createParking, updateParking, getAllParkings, getParkingById, removeParking } = require("../controllers/parking");
const router = Router();


// routes admin
router.post('/', validateJWT, ...validateParking, createParking);
router.put('/:id', validateJWT, ...validateUpdateParking, updateParking);

router.get('/', validateJWT, getAllParkings);

router.delete('/:id', validateJWT, ...validateIdParams, removeParking);

// routes admin and users
router.get('/:id', validateJWT, ...validateIdParams, getParkingById);

module.exports = router;