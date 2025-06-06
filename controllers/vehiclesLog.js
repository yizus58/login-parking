require('dotenv').config();
const {Op} = require("sequelize");
const { response } = require('express');
const { validateUserRole, validateVehiclePlate, responseError, userRoleResponse } = require('../utils/validation');
const db = require('../config/database');
const logger = require('../utils/logger');
const Parking = require('../models/Parking');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const idAdmin = Number(process.env.ID_ADMIN);
const idError = 3;

const getCurrentWeekDates = () => {
    const currentTime = new Date();
    const now = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000));


    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);

    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
};

const EntryVehicle = async (req, res = response) => {
    const { id_parking, vehicle_plate, model_vehicle } = req.body;
    const uid = req.uid;

    try {

        const validateUser = await validateUserRole(uid);
        if (validateUser === idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        let verifyPlate = vehicle_plate.replace(/-/g, '');
        const validatePlate = validateVehiclePlate(verifyPlate);
        if (validatePlate !== 0) {
            return responseError(validatePlate, res);
        }

        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parqueadero no encontrado'
            });
        }

        const findVehicle = await Vehicle.findOne({
            where: {
                plate_number: vehicle_plate
            }
        });

        if (findVehicle && findVehicle.status === 'IN') {

            if (findVehicle.id_parking === id_parking) {
                return res.status(400).json({
                    ok: false,
                    msg: 'No se puede Registrar Ingreso, el vehículo ya se encuentra dentro del parqueadero'
                });
            }

            return res.status(400).json({
                ok: false,
                msg: 'No se puede Registrar Ingreso, ya existe la placa en otro parqueadero'
            });
        }

        const currentTime = new Date();
        const entryTime = new Date(currentTime.getTime() - (5 * 60 * 60 * 1000));

        const vehicleEntry = new Vehicle(
            { id_parking, plate_number: vehicle_plate, model_vehicle, entry_time: entryTime, id_admin: uid }
        );

        await vehicleEntry.save();

        res.status(201).json({
            ok: true,
            data: vehicleEntry
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
                msg: 'Parqueadero no encontrado'
            });
        }

        const vehicleEntry = await Vehicle.findOne({
            where: {
                id_parking,
                plate_number: vehicle_plate,
                status: 'IN'
            }
        });

        if (!vehicleEntry) {
            return res.status(404).json({
                ok: false,
                msg: 'No se puede Registrar Salida, no existe la placa en el parqueadero'
            });
        }

        const currentTime = new Date();
        const exitTime = new Date(currentTime.getTime() - (5 * 60 * 60 * 1000));

        const costParking = parking.cost_per_hour;

        const entryTime = new Date(vehicleEntry.entry_time);
        const timeDifference = Math.abs(exitTime - entryTime);
        const minutesParked = Math.floor(timeDifference / (1000 * 60));

        const totalCost = Math.floor((minutesParked / 60) * costParking);

        vehicleEntry.exit_time = exitTime;
        await Vehicle.update(
            { exit_time: exitTime, status: 'OUT' },
            { where: { id_parking, plate_number: vehicle_plate } }
        );

        const { id_admin, id_parking: parking_id, ...vehicleWithOutIds } = vehicleEntry.toJSON();

        vehicleWithOutIds.total_cost = totalCost.toLocaleString('en-US');

        res.status(200).json({
            ok: true,
            data: vehicleWithOutIds,
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

const getTopVehicles = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser === idError) {
            return userRoleResponse(validateUser, res);
        }

        const topVehicles = await Vehicle.findAll({
            attributes: [
                'plate_number',
                [db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'total_visits']
            ],
            group: ['plate_number'],
            order: [[db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'DESC']],
            limit: 10
        });

        const topVehiclesWithoutIds = topVehicles.map(vehicle => {
            const { id_partner, id_admin, id_parking, ...rest } = vehicle.toJSON();
            return {
                ...rest,
                total_visits: parseInt(rest.total_visits)
            };
        });

        res.status(200).json({
            ok: true,
            data: topVehiclesWithoutIds
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

const getFirstTimeParkedVehicles = async (req, res = response) => {
    try {
        const firstTimeVehicles = await Vehicle.findAll({
            attributes: [
                'plate_number',
                'model_vehicle',
                'entry_time',
                'id_parking'
            ],
            where: {
                status: 'IN'
            },
            having: db.sequelize.literal('COUNT(plate_number) = 1'),
            include: [{
                model: Parking,
                attributes: ['name']
            }],
            group: ['plate_number', 'model_vehicle', 'entry_time', 'id_parking', 'Parking.id', 'Parking.name']
        });

        const firstTimeVehiclesWithoutIds = firstTimeVehicles.map(vehicle => {
            const { id_partner, id_admin, id_parking, id, ...rest } = vehicle.toJSON();
            return rest;
        });

        res.status(200).json({
            ok: true,
            total: firstTimeVehiclesWithoutIds.length,
            data: firstTimeVehiclesWithoutIds
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

const getTopVehiclesByParking = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser === idError) {
            return userRoleResponse(validateUser, res);
        }

        const topVehicles = await Vehicle.findAll({
            attributes: [
                'plate_number',
                'model_vehicle',
                [db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'total_visits']
            ],
            group: ['plate_number', 'model_vehicle'],
            order: [[db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'DESC']],
            limit: 10
        });

        const topVehiclesWithParkings = await Promise.all(topVehicles.map(async (vehicle) => {
            const vehicleData = vehicle.toJSON();

            const parkingVisits = await Vehicle.findAll({
                attributes: [
                    'id_parking',
                    [db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'visits']
                ],
                where: {
                    plate_number: vehicleData.plate_number
                },
                include: [{
                    model: Parking,
                    attributes: ['name']
                }],
                group: ['id_parking', 'Parking.id', 'Parking.name'],
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'DESC']]
            });

            const parkings = parkingVisits.map(parkingVisit => {
                const parkingData = parkingVisit.toJSON();
                return {
                    name: parkingData.Parking.name,
                    visits: parseInt(parkingData.visits)
                };
            });

            return {
                plate_number: vehicleData.plate_number,
                model_vehicle: vehicleData.model_vehicle,
                total_visits: parseInt(vehicleData.total_visits),
                parkings
            };
        }));

        res.status(200).json({
            ok: true,
            data: topVehiclesWithParkings
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

const getEarningsByPeriod = async (req, res = response) => {
    const { id_parking, start_date, end_date } = req.body;
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
                msg: 'Parqueadero no encontrado'
            });
        }

        let startDate, endDate;

        if (start_date && end_date) {

            if (!isValidDate(start_date) || !isValidDate(end_date)) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Formato de fecha inválido. Use: DD-MM-YYYY'
                });
            }

            startDate = parseDateString(start_date);
            endDate = parseDateString(end_date);

            if (startDate > endDate) {
                return res.status(400).json({
                    ok: false,
                    msg: 'La fecha inicial debe ser menor que la fecha final'
                });
            }

            endDate.setHours(23, 59, 59, 999);
        }

        const period = `${start_date} to ${end_date}`;


        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        const vehicles = await Vehicle.findAll({
            where: {
                id_parking,
                exit_time: {
                    [Op.gte]: startDateISO,
                    [Op.lte]: endDateISO
                },
                status: 'OUT'
            },
            attributes: [
                'entry_time',
                'exit_time'
            ]
        });

        if (vehicles.length === 0) {
            return res.status(200).json({
                ok: true,
                msg: "No se encontraron vehiculos en el parqueadero",
                data: {}
            });
        }

        let totalEarnings = 0;
        vehicles.forEach(vehicle => {
            const entryTime = new Date(vehicle.entry_time);
            const exitTime = new Date(vehicle.exit_time);
            const timeDifference = Math.abs(exitTime - entryTime);
            const hoursParked = Math.ceil(timeDifference / (1000 * 60 * 60));
            totalEarnings += hoursParked * parking.cost_per_hour;
        });

        res.status(200).json({
            ok: true,
            data: {
                period,
                totalEarnings: totalEarnings.toLocaleString('en-US'),
                totalVehicles: vehicles.length,
                startDate,
                endDate,
                parkingName: parking.name,
                costPerHour: parking.cost_per_hour
            }
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

const isValidDate = (dateString) => {
    const regex = /^\d{2}-\d{2}-\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);

    return date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year;
};

const parseDateString = (dateString) => {
    const [day, month, year] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    return date;
};


const getTopPartnersCurrentWeek = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const { startOfWeek, endOfWeek } = getCurrentWeekDates();

        const topPartners = await Vehicle.findAll({
            attributes: [
                [db.sequelize.col('Parking->partner.username'), 'partner_name'],
                [db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'vehicle_count']
            ],
            include: [{
                model: Parking,
                attributes: [],
                include: [{
                    model: User,
                    attributes: [],
                    as: 'partner',
                    where: {
                        role: 'SOCIO'
                    }
                }]
            }],
            where: {
                entry_time: {
                    [Op.gte]: startOfWeek,
                    [Op.lte]: endOfWeek
                }
            },
            group: ['Parking.id_partner', db.sequelize.col('Parking->partner.username')],
            order: [[db.sequelize.fn('COUNT', db.sequelize.col('Vehicle.id')), 'DESC']],
            limit: 3,
            raw: true
        });

        res.status(200).json({
            ok: true,
            data: {
                week_start: startOfWeek,
                week_end: endOfWeek,
                top_partners: topPartners
            }
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

const getTopParkingsEarningsCurrentWeek = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const { startOfWeek, endOfWeek } = getCurrentWeekDates();

        const vehicles = await Vehicle.findAll({
            attributes: [
                'id_parking',
                'entry_time',
                'exit_time'
            ],
            include: [{
                model: Parking,
                attributes: ['name', 'cost_per_hour']
            }],
            where: {
                exit_time: {
                    [Op.gte]: startOfWeek,
                    [Op.lte]: endOfWeek
                },
                status: 'OUT'
            },
            raw: true
        });

        const parkingEarnings = {};

        vehicles.forEach(vehicle => {
            const parkingId = vehicle.id_parking;
            const parkingName = vehicle['Parking.name'];
            const costPerHour = vehicle['Parking.cost_per_hour'];

            const entryTime = new Date(vehicle.entry_time);
            const exitTime = new Date(vehicle.exit_time);
            const timeDifference = Math.abs(exitTime - entryTime);
            const hoursParked = Math.ceil(timeDifference / (1000 * 60 * 60));
            const earnings = hoursParked * costPerHour;

            if (!parkingEarnings[parkingId]) {
                parkingEarnings[parkingId] = {
                    id: parkingId,
                    name: parkingName,
                    total_earnings: 0,
                    vehicle_count: 0
                };
            }

            parkingEarnings[parkingId].total_earnings += earnings;
            parkingEarnings[parkingId].vehicle_count += 1;
        });

        const topParkings = Object.values(parkingEarnings)
            .sort((a, b) => b.total_earnings - a.total_earnings)
            .slice(0, 3)
            .map(parking => ({
                ...parking,
                total_earnings: parking.total_earnings.toLocaleString('en-US')
            }));

        res.status(200).json({
            ok: true,
            data: {
                week_start: startOfWeek,
                week_end: endOfWeek,
                top_parkings: topParkings
            }
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Ha ocurrido un error, por favor comuníquese con el equipo de soporte'
        });
    }
};

module.exports = {
    EntryVehicle,
    ExitVehicle,
    getEarningsByPeriod,
    getFirstTimeParkedVehicles,
    getTopVehicles,
    getTopPartnersCurrentWeek,
    getTopParkingsEarningsCurrentWeek,
    getTopVehiclesByParking
}
