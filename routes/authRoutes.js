const { login, renewToken } = require('../controllers/auth');
const { Router } = require('express');
const { validateUserLogin } = require('../middlewares/validateUser');
const { validateJWT } = require('../middlewares/validate-jwt');
const router = Router();

router.post('/login', ...validateUserLogin, login);

router.get('/renew', validateJWT, renewToken);

module.exports = router;