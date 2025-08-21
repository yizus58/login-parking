require('dotenv').config();
const { response } = require('express');
const { VehiclesOutDetails, formateaFecha } = require("../controllers/vehiclesLog");
const Parking = require("../models/Parking");
const User = require('../models/User');
const Vehicle = require("../models/Vehicle");
const logger = require("../utils/logger");
const { generarExcelPorUsuario } = require("../utils/excel");
const {uploadFile, deleteFile} = require("../controllers/cloudflare");
const crypto = require("crypto");

const generateExcel = async (req, res = response) => {
    const { id } = req.params;
    const uid = req.uid;
    const data = await VehiclesOutDetails();

    if (!data) {
        return res.status(404).json({ status: 404, message: "No se encontró información para generar el Excel." });
    }

    for (const value of data) {

        const buffer = await generarExcelPorUsuario(value);

        try {
            const safeName = (value.parking || "diario").toString().replace(/[^\w\-]+/g, "_").substring(0, 50);
            const date = formateaFecha(new Date(), true);
            let filename = 'reporte_' + safeName + '_' + date + '.xlsx';
            let nameS3 = crypto.randomBytes(16).toString('hex');
            const contentType = process.env.MIME_TYPE_EXCEL || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const cfResult = await uploadFile(buffer, contentType, nameS3);

            return res.status(200).json({
                status: true,
                message: "Reporte generado y subido a Cloudflare correctamente.",
                cloudflare: {
                    key: cfResult?.key || null
                }
            });
        } catch (error) {
            logger.error('Error al guardar el archivo Excel:', error);
            return res.status(500).json({
                status: 500,
                message: "Error al guardar el archivo Excel en el escritorio."
            });
        }
    }
}

const removeExcelS3 = async (req, res = response) => {
    try {
        const { nameFile } = req.body;

        if (!nameFile) {
            return res.status(400).json({
                status: false,
                message: "El nombre del archivo es requerido."
            });
        }

        await deleteFile(nameFile);

        return res.status(200).json({
            status: true,
            message: "Archivo eliminado correctamente de Cloudflare R2."
        });

    } catch (error) {
        logger.error('Error al eliminar el archivo de Cloudflare R2:', error);
        return res.status(500).json({
            status: false,
            message: "Error al eliminar el archivo de Cloudflare R2.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = { generateExcel, removeExcelS3 };