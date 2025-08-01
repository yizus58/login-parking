require('dotenv').config();
const { response } = require('express');
const { validateUserRole, userRoleResponse} = require('../utils/validation');
const logger = require('../utils/logger');
const Parking = require('../models/Parking');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const idAdmin = Number(process.env.ID_ADMIN);

const createParking = async (req, res = response) => {
    const {name, address, capacity, cost, id_partner} = req.body;
    const uid = req.uid;
    const cost_per_hour = parseFloat(cost);

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const findUser = await User.findByPk(id_partner);
        if (!findUser) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const parking = new Parking(
            {name, address, capacity, cost_per_hour, id_partner}
        );

        await parking.save();
        res.status(201).json({
            ok: true,
            data: parking
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const updateParking = async (req, res = response) => {
    const {id_parking, name, address, capacity, cost_per_hour, id_partner} = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parqueadero no encontrado'
            });
        }

        await Parking.update(
            {name, address, capacity, cost_per_hour, id_partner},
            {where: {id: id_parking}}
        );
        res.status(200).json({
            ok: true,
            msg: 'Parqueadero actualizado correctamente'
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getAllParkings = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parkings = await Parking.findAll({
            include: [
                {
                    model: User,
                    as: 'partner',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Vehicle,
                    as: 'vehicles',
                    attributes: ['id', 'plate_number', 'model_vehicle', 'entry_time', 'exit_time', 'status']
                }
            ]
        });

        const parkingsWithoutIds = parkings.map(parking => {
            const { id_partner, id_admin, id_parking, ...rest } = parking.toJSON();
            return rest;
        });

        res.status(200).json({
            ok: true,
            data: parkingsWithoutIds
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getParkingById = async (req, res = response) => {
    const { id_parking } = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parking = await Parking.findAll({
            where: { id : id_parking },
            include: [
                {
                    model: User,
                    as: 'partner',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Vehicle,
                    as: 'vehicles',
                    attributes: ['id', 'plate_number', 'model_vehicle', 'entry_time', 'exit_time', 'status']
                }
            ]
        });

        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parqueadero no encontrado'
            });
        }

        const parkingsWithoutIds = parking.map(parking => {
            const { id_partner, id_admin, id_parking, ...rest } = parking.toJSON();
            return rest;
        });

        res.status(200).json({
            ok: true,
            data: parkingsWithoutIds
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getParkingByUser = async (req, res = response) => {
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser === idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parkings = await Parking.findAll({
            where: { id_partner: uid },
        });

        if (parkings.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontraron parkings para este usuario'
            });
        }

        const parkingsWithoutIds = parkings.map(parking => {
            const { id_partner, ...rest } = parking.toJSON();
            return rest;
        });

        res.status(200).json({
            ok: true,
            data: parkingsWithoutIds
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getDetailParking = async (req, res = response) => {
    const { id_parking } = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser === idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parkings = await Parking.findAll({
            where: { id_partner: uid, id: id_parking },
            include: [{
                model: Vehicle,
                as: 'vehicles',
                attributes: ['id', 'plate_number', 'model_vehicle', 'entry_time', 'exit_time', 'status'],
            }]
        });

        if (!parkings) {
            return res.status(404).json({
                ok: false,
                msg: 'Parqueadero no encontrado'
            });
        }

        const parkingsWithoutIds = parkings.map(parking => {
            const { id_partner, id_admin, id_parking, ...rest } = parking.toJSON();
            return rest;
        });

        res.status(200).json({
            ok: true,
            data: parkingsWithoutIds
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const removeParking = async (req, res = response) => {
    const {id_parking} = req.body;
    const uid = req.uid;

    try {
        const validateUser = await validateUserRole(uid);
        if (validateUser !== idAdmin) {
            return userRoleResponse(validateUser, res);
        }

        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parqueadero no encontrado'
            });
        }

        await Parking.destroy({where: {id: id_parking}});
        res.status(200).json({
            ok: true,
            msg: 'Parqueadero eliminado correctamente'
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

module.exports = {
    getAllParkings,
    getParkingById,
    getParkingByUser,
    getDetailParking,
    createParking,
    updateParking,
    removeParking
}
