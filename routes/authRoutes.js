const { createUser, login, renewToken, getAllUsers, listTables} = require('../controllers/auth');
const { check } = require('express-validator');
const { Router } = require('express');
const { validateUserLogin, validateUserNew } = require('../middlewares/validateUser');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/new', ...validateUserNew, validateJWT, createUser);

router.post('/login', ...validateUserLogin, login);

router.get('/renew', validateJWT, renewToken);
router.get('/all_users', validateJWT, getAllUsers);
router.get('/list_tables', listTables);

module.exports = router;