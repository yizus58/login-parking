const { createUser, getAllUsers, updateUser, getAllUsersWithAdmin } = require('../controllers/userController');
const { Router } = require('express');
const { validateUserNew } = require('../middlewares/validateUser');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/', validateJWT, ...validateUserNew, createUser);

router.put('/', validateJWT, ...validateUserNew, updateUser);

router.get('/', validateJWT, getAllUsers);

router.get('/especial', validateJWT, getAllUsersWithAdmin);

module.exports = router;