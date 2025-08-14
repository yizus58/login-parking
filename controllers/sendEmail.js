const User = require('../models/User');
const logger = require('../utils/logger');
const { sendEmail, sendMultipleEmails, sendEmailVehiclesOutToday } = require('../services/emailService');
const { VehiclesOutParking } = require("../controllers/vehiclesLog");
const Vehicle = require('../models/Vehicle');
const {sendPost} = require("../config/http");

const sendEmailToPartner = async (req, res) => {
    try {
        const { email, text, vehicle_plate, parking_name } = req.body;

        const partner = await User.findOne({
            where: {
                email: email,
                role: 'SOCIO'
            }
        });

        if (!partner) {
            return res.status(404).json({
                result: false,
                message: 'Socio no encontrado'
            });
        }

        const vehicleEntry = await Vehicle.findOne({
            where: {
                plate_number: vehicle_plate,
                status: 'IN'
            }
        })

        if (!vehicleEntry) {
            return res.status(404).json({
                result: false,
                msg: 'No se puede enviar el correo, no existe la placa en el parqueadero'
            });
        }

        const result = await sendEmail({
            email: partner.email,
            text,
            vehicle_plate,
            parking_name
        });

        return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        logger.error('Error al enviar correo a socio:', error);
        return res.status(500).json({
            result: false,
            message: 'Error al enviar correo',
            error: error.message
        });
    }
};

const sendEmailToTest = async (req, res) => {
    try {
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
                logger.error('Error al enviar correo a socio:', { email, error: send.message });
                return res.status(500).json({
                    result: false,
                    message: 'Error al enviar correo',
                    error: send.message
                })
            }
        }

        return res.status(200).json({ result: true, message: 'Emails sent successfully' });

    } catch (error) {
        logger.error('Error al enviar correo a socio:', error);
        return res.status(500).json({
            result: false,
            message: 'Error al enviar correos',
            error: error.message
        });
    }
};

const sendEmailToAllPartners = async (req, res) => {
    try {
        const { text, vehicle_plate, parking_name } = req.body;

        if (!text) {
            return res.status(400).json({
                result: false,
                message: 'El mensaje es requerido'
            });
        }

        const partners = await User.findAll({
            where: {
                role: 'SOCIO'
            }
        });

        if (partners.length === 0) {
            return res.status(404).json({
                result: false,
                message: 'No se encontraron socios en el sistema'
            });
        }

        const vehicleEntry = await Vehicle.findOne({
            where: {
                plate_number: vehicle_plate,
                status: 'IN'
            }
        })

        if (!vehicleEntry) {
            return res.status(404).json({
                result: false,
                msg: 'No se puede enviar el correo, no existe la placa en el parqueadero'
            });
        }

        const emails = partners.map(partner => partner.email);

        const result = await sendMultipleEmails({
            emails,
            text,
            vehicle_plate,
            parking_name
        });

        return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        logger.error('Error al enviar correos a todos los socios:', error);
        return res.status(500).json({
            result: false,
            message: 'Error al enviar correos',
            error: error.message
        });
    }
};

module.exports = {
    sendEmailToPartner,
    sendEmailToAllPartners,
    sendEmailToTest
};