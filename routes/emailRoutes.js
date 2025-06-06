const { Router } = require('express');
const { validateJWT } = require('../middlewares/validate-jwt');
const { sendEmailToPartner, sendEmailToAllPartners } = require('../controllers/sendEmail');
const { validateEmailRequest, validateAllEmailRequest } = require('../middlewares/validateEmail');

const router = Router();

router.post('/send-to-partner', validateJWT, ...validateEmailRequest, sendEmailToPartner);

router.post('/send-to-multi-partners', validateJWT, ...validateAllEmailRequest, sendEmailToAllPartners);

module.exports = router;