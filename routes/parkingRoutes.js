const { Router } = require('express');
const { validateParking, validateUpdateParking, validateIdParams } = require('../middlewares/validateParking');
const { validateJWT } = require('../middlewares/validate-jwt');
const { createParking, updateParking, getAllParkings, getParkingById, removeParking } = require("../controllers/parking");
const router = Router();


// routes admin
router.post('/', ...validateParking, validateJWT,createParking);
router.put('/:id', ...validateUpdateParking, validateJWT, updateParking);

router.get('/', validateJWT, getAllParkings);

router.delete('/:id', ...validateIdParams, validateJWT, removeParking);

// routes admin and users
router.get('/:id', ...validateIdParams, validateJWT, getParkingById);

module.exports = router;