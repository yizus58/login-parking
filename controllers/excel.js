require('dotenv').config();
const { response } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Parking = require("../models/Parking");
const User = require('../models/User');
const Vehicle = require("../models/Vehicle");
const logger = require("../utils/logger");
const { generarExcelPorUsuario } = require("../utils/excel");


function formateaFecha(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year}-${hour}:${minutes}`;
}


const generateExcel = async (req, res = response) => {
    const { id } = req.params;
    const uid = req.uid;
    const data = await getDetailParking(id, uid);
    if (!data) {
        return res.status(404).json({ status: 404, message: "No se encontró información para generar el Excel." });
    }

    const buffer = await generarExcelPorUsuario(data);

    const safeName = (data.parking || "reporte").toString().replace(/[^\w\-]+/g, "_").substring(0, 50);
    const filename = `reporte_${safeName}.xlsx`;

    const desktopPath = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopPath, filename);

    try {
        fs.writeFileSync(filePath, buffer);
        logger.info(`Archivo Excel guardado en: ${filePath}`);

        res.set({
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": buffer.length
        });

        return res.status(200).json({
            status: true,
            message: "Se guardo el archivo Excel en el escritorio."
        });

    } catch (error) {
        logger.error('Error al guardar el archivo Excel:', error);
        return res.status(500).json({
            status: 500,
            message: "Error al guardar el archivo Excel en el escritorio."
        });
    }
}

const getDetailParking = async (id, id_user) => {

    try {

        const parkingsDetail = await Parking.findAll({
            where: { id_partner: id_user, id: id },
            include: [
                {
                    model: Vehicle,
                    as: 'vehicles',
                    attributes: ['id', 'plate_number', 'model_vehicle', 'entry_time', 'exit_time', 'status', 'cost_per_hour'],
                    where: {status: 'OUT'}
                }
            ]
        });

        const userDetail = await User.findByPk(id_user);

        if (!parkingsDetail || parkingsDetail.length === 0) {
            return false;
        }
        const parkingVehicles = parkingsDetail[0].vehicles;

        const vehicles = parkingVehicles.reduce((earnings, vehicle) => {
            const { id: vehicleId, cost_per_hour: costPerHour, entry_time, exit_time, plate_number, model_vehicle } = vehicle;

            const entryTime = new Date(entry_time);
            const exitTime = new Date(exit_time);

            const minutesParked = Math.floor((exitTime - entryTime) / 60000);

            const hoursParked = Math.ceil(minutesParked / 60);
            const totalCost = hoursParked * costPerHour;

            const day = formateaFecha(exitTime);

            earnings[vehicleId] = {
                vehicle_id: vehicleId,
                plate_number,
                model_vehicle,
                day,
                total_cost: totalCost
            };

            return earnings;
        }, {});

        return {
            parking: parkingsDetail[0].name,
            username: userDetail.username,
            email: userDetail.email,
            vehicles: vehicles
        }
    } catch (error) {
        logger.error(error);
        return false;
    }
}

module.exports = { generateExcel };