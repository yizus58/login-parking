const cron = require('node-cron');
const { VehiclesOutParking } = require("../controllers/vehiclesLog");
const logger = require('../utils/logger');
const {sendPost} = require("./http");

function initCronJobs() {
    console.log('Cron inicializado');

    const task = cron.schedule('59 23 * * *', () => {
        console.log('Ejecutado 11:59 PM America/Bogota', new Date().toISOString());
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });

    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 60000);
    const minutes = scheduledTime.getMinutes();
    const hours = scheduledTime.getHours();

    const task1 = cron.schedule(`${minutes} * * * *`, async () => {
        try {
            console.log(`Ejecutando tarea a las ${scheduledTime.getHours()}:${scheduledTime.getMinutes()} America/Bogota`);
            const dataVehicleOutParking = await VehiclesOutParking();

            if (Object.values(dataVehicleOutParking).length === 0) {
                return res.status(404).json({
                    result: false,
                    message: 'No hay vehículos que salieron del parqueadero hoy'
                });
            }

            for (const vehicle of Object.values(dataVehicleOutParking)) {
                const email = vehicle.email_partner;
                let htmlContent = `<p>Hola ${vehicle.name_partner}, hoy ha habido un total de 
                                ${vehicle.vehicle_count} vehículos en ${vehicle.name}. 
                                El total de ingresos fue de $${vehicle.total_earnings}.</p><br>`;

                htmlContent += `<p>Si necesitas más información, no dudes en contactar al equipo de soporte del sistema.</p><br>`;

                htmlContent += `<p>Este es un mensaje automático, no responda a este correo.</p>`;

                htmlContent += `<style> body {font-family: Arial, sans-serif;} p {color: #333; font-size: 19px;} 
                        </style>`;

                const send = await sendPost({recipient: email, html: htmlContent, subject: process.env.APP_SUBJECT});

                if (!send.result) {
                    logger.error('Error al enviar correo a socio:', {email, error: send.message});
                }
            }
            console.log('Tarea programada finalizada');
        } catch (error) {
            logger.error('Error en la tarea programada:', error);
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota',
    });

    task.start();
    task1.start();
}

module.exports = initCronJobs;