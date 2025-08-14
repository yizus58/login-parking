const cron = require('node-cron');
const { VehiclesOutParking } = require("../controllers/vehiclesLog");
const logger = require('../utils/logger');
const { sendPost } = require("./http");
const generateHtmlContent = require("../public/htmlReport");

function initCronJobs() {
    console.log('Cron inicializado');
    const cronTimeDelay = process.env.CRON_HOUR_DETERMINATION;

    const dailyTask = cron.schedule(cronTimeDelay, async () => {
        try {
            const dataVehicleOutParking = await VehiclesOutParking();

            if (Object.values(dataVehicleOutParking).length === 0) {
                logger.error('No hay vehículos que salieron del parqueadero en la última hora');
                return;
            }

            for (const vehicle of Object.values(dataVehicleOutParking)) {
                const email = vehicle.email_partner;
                const htmlContent = generateHtmlContent(vehicle);

                try {
                    const send = await sendPost({recipient: email, html: htmlContent, subject: process.env.APP_SUBJECT});
                    if (!send.result) {
                        logger.error('Error al enviar correo a socio:', {email, error: send.message});
                    }
                } catch (emailError) {
                    logger.error('Error al enviar correo:', emailError);
                }
            }
            console.log('Tarea horaria finalizada');
        } catch (error) {
            logger.error('Error en la tarea horaria:', error);
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });

    dailyTask.start();
}

module.exports = initCronJobs;