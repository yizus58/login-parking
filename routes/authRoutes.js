const { createUser, login, renewToken, clearTable, getAllUsers, listTables} = require('../controllers/auth');
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

router.delete('/remove_table', clearTable);

module.exports = router;