const { response } = require('express');
const bcrypt = require('bcryptjs');
const Parking = require('../models/Parking');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

const validateExistingUser = async (email, username, res = response) => {
    const emailExist = await User.findOne({ where: { email } });
    if (emailExist) {
        return res.status(409).json({
            result: false,
            msg: 'El correo ya se encuentra registrado, por favor ingrese otro'
        });
    }

    const usernameExist = await User.findOne({ where: { username } });
    if (usernameExist) {
        return res.status(409).json({
            result: false,
            msg: 'El usuario ya se encuentra registrado, por favor ingrese otro'
        });
    }
    return 0;
}

const validateCapacity = async (parking, capacity, res = response) => {
    const parkingId = parking.id;

    const parkings = await Parking.findAll({
        include: [
            {
                model: Vehicle,
                as: 'vehicles',
                where: {
                    status: 'IN'
                }
            }
        ],
        where: {
            id: parkingId
        }
    });


    if (parkings.length > 0) {
        const vehicles = parkings[0].dataValues.vehicles;
        const totalVehicles = vehicles.length;

        if (totalVehicles >= capacity || totalVehicles === capacity) {
            return res.status(406).json({
                result: false,
                msg: 'El parqueadero no tiene suficiente espacio disponible, por favor revise el listado del parqueadero'
            });
        }
    }
    return 0;
}

const validateCostCapacity = async (cost, capacity, res = response) => {

    const validCost = cost > 0;

    if (!validCost) {
        return res.status(406).json({
            result: false,
            msg: 'El costo del parqueadero debe ser mayor a 0'
        });
    }

    const validCapacity = capacity > 0;
    if (!validCapacity) {
        return res.status(406).json({
            result: false,
            msg: 'La capacidad del parqueadero no debe ser menor a 1'
        });
    }
    return 0;
}

const validateUserByEmailExists = async (email, res = response) => {
    return await User.findOne({ where: { email } });
}

const validatePassword = (password, userPassword, res = response) => {
    return bcrypt.compareSync(password, userPassword);
}

const validateUserRole = async (uid) => {
    const user = await User.findByPk(uid);
    if (!user) return 0;

    const roleCodes = {
        'ADMIN': 1,
        'SOCIO': 2
    };

    return roleCodes[user.role] ?? 3;
}

const userRoleResponse = (errorNumber, res = response) => {
    switch (errorNumber) {
        case 0:
            return res.status(404).json({
                result: false,
                msg: 'Usuario no encontrado'
            });
        case 1:
            return res.status(403).json({
                result: false,
                msg: 'No tiene permisos para realizar esta acción'
            });
        case 2:
            return res.status(403).json({
                result: false,
                msg: 'Lo sentimos, los usuarios no pueden realizar esta acción'
            });
        default:
            return res.status(500).json({
                result: false,
                msg: 'Oops, a ocurrido un error, por favor comuniquese con el equipo de soporte'
            });
    }
}

const validateVehiclePlate = (plateNumber) => {
    const validations = [
        {
            pattern: /[ñÑ]/,
            errorCode: 1,
            validate: (plate, pattern) => !pattern.test(plate)
        },
        {
            pattern: /^[A-Z0-9]{6}$/i,
            errorCode: 2,
            validate: (plate, pattern) => pattern.test(plate)
        },
        {
            pattern: /[^A-Z0-9]/i,
            errorCode: 3,
            validate: (plate, pattern) => !pattern.test(plate)
        }
    ];

    const failedValidation = validations.find(
        validation => !validation.validate(plateNumber, validation.pattern)
    );

    return failedValidation ? failedValidation.errorCode : 0;
};

const validatePlate = async (id_parking, plate_number) => {
    const cleanPlate = plate_number.replace(/\s+/g, '').toUpperCase();
    let newPlate = '';

    const findVehicleIn = await Vehicle.findOne({
        where: {
            id_parking,
            plate_number: cleanPlate,
            status: 'IN'
        }
    });

    if (!findVehicleIn) {
        if (cleanPlate.includes('-')) {
            return false;
        }

        const letters = cleanPlate.substring(0, 3);
        const numbers = cleanPlate.substring(3);

        if (/^[A-Z]{3}$/.test(letters) && /^\d{3}$/.test(numbers)) {
            newPlate = `${letters}-${numbers}`;
        }

        if (newPlate.length === 7) {

            const findNewPlate = await Vehicle.findOne({
                where: {
                    id_parking,
                    plate_number: newPlate,
                    status: 'IN'
                }
            });

            if (!findNewPlate) {
                return false;
            }
        }
        return false;
    }
    return true;
};

const responseError = (error, res = response) => {
    switch (error) {
        case 1:
            return res.status(400).json({
                result: false,
                msg: 'La placa no puede contener la letra ñ'
            });
        case 2:
            return res.status(400).json({
                result: false,
                msg: 'La placa debe tener exactamente 6 caracteres alfanuméricos'
            });
        case 3:
            return res.status(400).json({
                result: false,
                msg: 'La placa no puede contener caracteres especiales'
            });
    }
};


module.exports = {
    responseError,
    userRoleResponse,
    validateCapacity,
    validateCostCapacity,
    validateExistingUser,
    validateUserByEmailExists,
    validatePassword,
    validateUserRole,
    validatePlate,
    validateVehiclePlate
};