const { VehiclesOutParking } = require("../../controllers/vehiclesLog");
const logger = require('../../utils/logger');
const { notificationEmail } = require("../../controllers/request");
const generateHtmlContent = require("../../public/htmlReport");
const { RabbitMQPublisherBackoff } = require('../../utils/rabbitmq');

const executeDailyTask = async () => {
    const dataVehicleOutParking = await VehiclesOutParking();
    const methodSend = process.env.FLAG_SEND;

    if (Object.values(dataVehicleOutParking).length === 0) {
        logger.error('No hay vehículos que salieron del parqueadero en la última hora');
        return;
    }

    for (const vehicle of Object.values(dataVehicleOutParking)) {
        const email = vehicle.email_partner;
        const htmlContent = generateHtmlContent(vehicle);
        const data = { recipients: email, html: htmlContent, subject: process.env.APP_SUBJECT };

        try {
            if (methodSend === 1) {
                const send = await notificationEmail(data);
                if (!send.result) {
                    logger.error('Error al enviar correo a socio:', {email, error: send.message});
                    return false;
                }
                return true;
            } else {
                await RabbitMQPublisherBackoff(data);
            }

        } catch (emailError) {
            logger.error('Error al enviar correo:', emailError);
            return false;
        }
    }
    return true;
}

module.exports = { executeDailyTask };