const nodemailer = require("nodemailer");
const logger = require('../utils/logger');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendEmail = async ({ email, text, vehicle_plate, parking_name }) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return { success: true, message: "Correo simulado enviado" };
        }

        const transporter = createTransporter();

        let htmlContent = `<p>${text}</p>`;
        if (vehicle_plate) {
            htmlContent += `<p>Placa: ${vehicle_plate}</p>`;
        }
        if (parking_name) {
            htmlContent += `<p>Parqueadero: ${parking_name}</p>`;
        }

        const info = await transporter.sendMail({
            from: `"Sistema de Parqueadero" <${process.env.ADMIN_EMAIL}>`,
            to: email,
            subject: "Notificación del Sistema de Parqueadero",
            html: htmlContent,
            replyTo: process.env.ADMIN_EMAIL,
        });

        return { success: true, message: "Correo enviado correctamente", messageId: info.messageId };
    } catch (error) {
        logger.error("Error al enviar correo:", error);
        return { success: false, message: "Error al enviar correo", error: error.message };
    }
};

const sendMultipleEmails = async ({ emails, text, vehicle_plate, parking_name }) => {
    try {
        const results = [];

        if (!Array.isArray(emails)) {
            return { success: false, message: "El campo emails debe ser un arreglo" };
        }

        for (const email of emails) {
            const result = await sendEmail({ email, text, vehicle_plate, parking_name });
            results.push({ email, ...result });
        }

        const allSuccessful = results.every(r => r.success);
        return {
            success: allSuccessful,
            message: allSuccessful ? "Todos los correos enviados correctamente" : "Algunos correos no pudieron enviarse",
            results
        };
    } catch (error) {
        logger.error("Error al enviar correos múltiples:", error);
        return { success: false, message: "Error al enviar correos múltiples", error: error.message };
    }
};

module.exports = {
    sendEmail,
    sendMultipleEmails
};
