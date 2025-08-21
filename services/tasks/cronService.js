const crypto = require('crypto');
const logger = require('../../utils/logger');
const {generarExcelPorUsuario} = require("../../utils/excel");
const { htmlContent, htmlContentFile } = require("../../public/htmlReport");
const { notificationEmail } = require("../../controllers/request");
const { RabbitMQPublisherBackoff } = require('../../utils/rabbitmq');
const {uploadFile} = require("../../controllers/cloudflare");
const { VehiclesOutParking, VehiclesOutDetails, formateaFecha} = require("../../controllers/vehiclesLog");

const methodSend = process.env.FLAG_SEND;

const executeDailyTask = async () => {
    const dataVehicleOutParking = await VehiclesOutParking();

    if (Object.values(dataVehicleOutParking).length === 0) {
        logger.error('No hay vehículos que salieron del parqueadero en la última hora');
        return;
    }

    for (const vehicle of Object.values(dataVehicleOutParking)) {
        const email = vehicle.email_partner;
        const html = htmlContent(vehicle);
        const data = { recipients: email, html: html, subject: process.env.APP_SUBJECT };

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

const executeReportTask = async () => {
    const dataVehicles = await VehiclesOutDetails();

    if (!dataVehicles) {
        return res.status(404).json({ status: 404, message: "No se encontró información para generar el Excel." });
    }

    for (const data_v of dataVehicles) {

        const buffer = await generarExcelPorUsuario(data_v);

        try {
            const safeName = (data_v.parking || "diario").toString().replace(/[^\w\-]+/g, "_").substring(0, 50);
            const dateGenerate = formateaFecha(new Date(), true);
            let filename = 'reporte_' + safeName + '_' + dateGenerate + '.xlsx';
            let nameS3 = crypto.randomBytes(16).toString('hex');
            filename = filename.toLowerCase();
            const contentType = process.env.MIME_TYPE_EXCEL || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const email = data_v.email;
            const html = htmlContentFile(data_v, filename);
            const data = { recipients: email, html: html, subject: process.env.APP_SUBJECT, attachments: {name_file: filename, s3_name: nameS3} };

            await uploadFile(buffer, contentType, nameS3);

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


        } catch (error) {
            logger.error('Error al guardar el archivo Excel:', error);
            return false;
        }
    }
}

module.exports = { executeDailyTask, executeReportTask };