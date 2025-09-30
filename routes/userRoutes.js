const { createUser, getAllUsers } = require('../controllers/userController');
const { Router } = require('express');
const { validateUserNew } = require('../middlewares/validateUser');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/', validateJWT, ...validateUserNew, createUser);

router.get('/', validateJWT, getAllUsers);

module.exports = router;