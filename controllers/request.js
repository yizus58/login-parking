const { Post } = require("../services/axiosService");
const logger = require("../utils/logger");

const notificationEmail = async (data) => {
    try {
        const httpApi = process.env.MICROSERVICE_URL;
        const headers = { 'Content-Type': 'application/json' };

        const send = await Post(httpApi+'/mail/send', data, headers);
        if (!send.data.result) {
            logger.error('Error al enviar correo a socio:', {email, error: send.message});
            return false;
        }
        return send;
    } catch (error) {
        console.error('Oops! There was an error: ', error);
    }
};

module.exports = {
    notificationEmail
}