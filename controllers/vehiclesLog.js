require('dotenv').config();
const { response } = require('express');
const { validateUserRole, userRoleResponse} = require('../utils/validation');
const logger = require('../utils/logger');
const Parking = require('../models/Parking');
const User = require('../models/User');
const vehicle = require('../models/Vehicle');
const idAdmin = Number(process.env.ID_ADMIN);

const EntryVehicle = async (req, res = response) => {
    const { id_parking, vehicle_plate, vehicle_type } = req.body;
    const uid = req.uid;

    try {

        const validateUser = await validateUserRole(uid);
        if (validateUser === idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parking no encontrado'
            });
        }

        const vehicle = await User.findOne({
            where: {
                vehicle_plate: vehicle_plate
            }
        });
        if (vehicle) {
            return res.status(400).json({
                ok: false,
                msg: 'No se puede Registrar Ingreso, ya existe la placa en otro parqueadero'
            });
        }

        const entryTime = new Date();
        const vehicleEntry = {
            id_parking,
            vehicle_plate,
            vehicle_type,
            entry_time: entryTime
        };

        await VehicleEntry.create(vehicleEntry);

        res.status(201).json({
            ok: true,
            vehicleEntry
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const ExitVehicle = async (req, res = response) => {
    const { id_parking, vehicle_plate } = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser === idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parking no encontrado'
            });
        }

        const vehicleEntry = await VehicleEntry.findOne({
            where: {
                id_parking,
                vehicle_plate
            }
        });

        if (!vehicleEntry) {
            return res.status(404).json({
                ok: false,
                msg: 'No se puede Registrar Salida, no existe la placa en el parqueadero'
            });
        }

        const exitTime = new Date();

        const costParking = parking.cost_per_hour;

        const entryTime = new Date(vehicleEntry.entry_time);
        const timeDifference = Math.abs(exitTime - entryTime);
        const minutesParked = Math.ceil(timeDifference / (1000 * 60));

        const totalCost = Math.ceil(minutesParked / 60) * costParking;

        vehicleEntry.exit_time = exitTime;
        await vehicleEntry.update(
            { exit_time: exitTime, status: 'OUT' },
            { where: { id_parking, vehicle_plate } }
        );
        vehicleEntry.total_cost = totalCost;

        res.status(200).json({
            ok: true,
            vehicleEntry,
            msg: 'Salida registrada',
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}