const { Router } = require('express');
const { createUser, login, renewToken, clearTable, getAllUsers, listTables} = require('../contollers/auth');
const { check } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/new', [
    check('username','El username es obligatorio').not().isEmpty(),
    check('password','El password es obligatorio').not().isEmpty(),
    check('email','El email es obligatorio').isEmail(),
    validateJWT
] ,createUser);

router.post('/login', [
    check('email','El email es obligatorio').isEmail(),
    check('password','El password es obligatorio').not().isEmpty(),
    validate
], login);

router.get('/renew', validateJWT, renewToken);
router.get('/all_users', validateJWT, getAllUsers);
router.get('/list-tables', listTables);

router.delete('/remove-table', clearTable);

module.exports = router;