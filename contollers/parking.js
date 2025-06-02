require('dotenv').config();
const { generateJWT } = require('../helpers/jwt');
const { response } = require('express');
const { validateUserRole } = require('./validation');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Parking = require('../models/Parking');

const createParking = async (req, res = response) => {
    const { name, location, capacity, id_partner } = req.body;
    const uid = req.uid;

    try {
        await validateUserRole(uid);

        const findUser = await User.findByPk(id_partner);
        if (!findUser) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const parking = new Parking({
            name,
            location,
            capacity,
            id_partner
        });

        await parking.save();
        res.status(201).json({
            ok: true,
            parking
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const updateParking = async (req, res = response) => {
    const { id_parking, name, capacity, location, id_partner  } = req.body;
    const uid = req.uid;

    try {
        await validateUserRole(uid);
        const parking = await Parking.findByPk(id_parking);
        if (!parking) {
            return res.status(404).json({
                ok: false,
                msg: 'Parking no encontrado'
            });
        }

        await Parking.update(
            { name, location, capacity, id_partner },
            { where: { id: id_parking } }
        );
        res.status(200).json({
            ok: true,
            msg: 'Parking actualizado correctamente'
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}

const getAllParkings = async (req, res = response) => {
    const uid = req.uid;

    try {
        await validateUserRole(uid);
        const parkings = await Parking.findAll({
            include: [{
                model: User,
                as: 'administrator',
                attributes: ['id', 'name', 'email']
            }]
        });
        res.status(200).json({
            ok: true,
            parkings
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
        });
    }
}


module.exports = {
    getParkings,
    createParking,
    updateParking
}