const { createUser, getAllUsers } = require('../controllers/auth');
const { Router } = require('express');
const { validateUserNew } = require('../middlewares/validateUser');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/', ...validateUserNew, validateJWT, createUser);

router.get('/', validateJWT, getAllUsers);

module.exports = router;