const nodemailer = require("nodemailer");

const sendEmail = async ({ email, placa, mensaje, parqueaderoNombre }) => {
    console.log(`📩 Simulación de envío de correo a ${email}`);
    console.log({ email, placa, mensaje, parqueaderoNombre });

    return { message: "Correo Enviado" };
};

module.exports = sendEmail;