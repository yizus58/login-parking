const { VehiclesOutParking } = require("../../controllers/vehiclesLog");
const logger = require('../../utils/logger');
const { notificationEmail } = require("../../controllers/request");
const generateHtmlContent = require("../../public/htmlReport");

const executeDailyTask = async () => {
    const dataVehicleOutParking = await VehiclesOutParking();

    if (Object.values(dataVehicleOutParking).length === 0) {
        logger.error('No hay vehículos que salieron del parqueadero en la última hora');
        return;
    }

    for (const vehicle of Object.values(dataVehicleOutParking)) {
        const email = vehicle.email_partner;
        const htmlContent = generateHtmlContent(vehicle);

        try {
            const send = await notificationEmail({recipients: email, html: htmlContent, subject: process.env.APP_SUBJECT});
            if (!send.result) {
                logger.error('Error al enviar correo a socio:', {email, error: send.message});
                return false;
            }
        } catch (emailError) {
            logger.error('Error al enviar correo:', emailError);
            return false;
        }
    }
    return true;
}

module.exports = { executeDailyTask };