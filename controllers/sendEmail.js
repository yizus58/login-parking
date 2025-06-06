const User = require('../models/User');
const logger = require('../utils/logger');
const { sendEmail, sendMultipleEmails } = require('../services/emailService');
const Vehicle = require('../models/Vehicle');


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
                success: false,
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
                ok: false,
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
            success: false,
            message: 'Error al enviar correo',
            error: error.message
        });
    }
};


const sendEmailToAllPartners = async (req, res) => {
    try {
        const { text, vehicle_plate, parking_name } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
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
                success: false,
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
                ok: false,
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
            success: false,
            message: 'Error al enviar correos',
            error: error.message
        });
    }
};


module.exports = {
    sendEmailToPartner,
    sendEmailToAllPartners
};