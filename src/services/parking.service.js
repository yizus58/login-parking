'use strict';

const { getModels, VEHICLE_STATUS } = require('../models');
const { ROLES } = require('../models/roles');
const { badRequest, conflict, forbidden, notFound } = require('../utils/errors');

const PARKING_NOT_FOUND = 'Parqueadero no encontrado';
const VEHICLE_ATTRIBUTES = ['id', 'plate_number', 'model_vehicle', 'entry_time', 'exit_time', 'status'];

const partnerInclude = () => ({ model: getModels().User, as: 'partner', attributes: ['id', 'username', 'email'] });
const vehiclesInclude = () => ({ model: getModels().Vehicle, as: 'vehicles', attributes: VEHICLE_ATTRIBUTES });

const toParkingResponse = (parking) => {
    const { id_partner: _partner, ...rest } = parking.toJSON();
    return rest;
};

async function ensurePartner(id) {
    const user = await getModels().User.findByPk(id);
    if (!user) throw notFound('Usuario no encontrado');
    if (user.role !== ROLES.SOCIO) {
        throw badRequest('El usuario no es socio, por favor ingrese a otro usuario con rol socio');
    }
    return user;
}

const openStays = (parkingId, transaction) =>
    getModels().Vehicle.count({ where: { id_parking: parkingId, status: VEHICLE_STATUS.IN }, transaction });

/**
 * The parking `id` if `user` may operate it: an ADMIN any parking, a SOCIO only its own.
 * 404 when it does not exist, 403 when it belongs to another partner.
 */
async function getAccessibleParking(user, id, options = {}) {
    const parking = await getModels().Parking.findByPk(id, options);
    if (!parking) throw notFound(PARKING_NOT_FOUND);
    if (user.role !== ROLES.ADMIN && parking.id_partner !== user.id) {
        throw forbidden('El parqueadero no le pertenece');
    }
    return parking;
}

async function createParking({ name, address, capacity, cost, id_partner }) {
    await ensurePartner(id_partner);
    const parking = await getModels().Parking.create({ name, address, capacity, cost_per_hour: cost, id_partner });
    return parking.toJSON();
}

/** The new capacity cannot be lower than the vehicles currently inside. */
async function updateParking(id, { name, address, capacity, cost, id_partner }) {
    const { Parking } = getModels();
    const parking = await Parking.findByPk(id);
    if (!parking) throw notFound(PARKING_NOT_FOUND);
    if (id_partner !== parking.id_partner) await ensurePartner(id_partner);
    const inside = await openStays(parking.id);
    if (capacity < inside) {
        throw conflict(`La capacidad no puede ser menor a los ${inside} vehículos que están dentro del parqueadero`);
    }
    await parking.update({ name, address, capacity, cost_per_hour: cost, id_partner });
    return parking.toJSON();
}

async function listParkings() {
    const parkings = await getModels().Parking.findAll({
        include: [partnerInclude(), vehiclesInclude()],
        order: [['id', 'ASC']],
    });
    return parkings.map(toParkingResponse);
}

/** The partner's own parkings (without vehicles). */
async function listOwnParkings(user) {
    const parkings = await getModels().Parking.findAll({ where: { id_partner: user.id }, order: [['id', 'ASC']] });
    return parkings.map(toParkingResponse);
}

/** One parking with its partner and vehicles; a SOCIO only sees its own. */
async function getParking(user, id) {
    await getAccessibleParking(user, id);
    const parking = await getModels().Parking.findByPk(id, { include: [partnerInclude(), vehiclesInclude()] });
    return toParkingResponse(parking);
}

/** A partner's parking with its vehicles (the detail screen of the partner). */
async function getParkingDetail(user, id) {
    if (user.role !== ROLES.SOCIO) throw forbidden('Solo los socios consultan el detalle de sus parqueaderos');
    await getAccessibleParking(user, id);
    const parking = await getModels().Parking.findByPk(id, { include: [vehiclesInclude()] });
    return toParkingResponse(parking);
}

/** Refused while vehicles are inside; otherwise the parking and its history are deleted. */
async function removeParking(id) {
    const { Parking, sequelize } = getModels();
    await sequelize.transaction(async (transaction) => {
        const parking = await Parking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!parking) throw notFound(PARKING_NOT_FOUND);
        if ((await openStays(parking.id, transaction)) > 0) {
            throw conflict('No se puede eliminar el parqueadero, hay vehículos dentro');
        }
        await parking.destroy({ transaction });
    });
}

module.exports = {
    PARKING_NOT_FOUND,
    getAccessibleParking,
    createParking,
    updateParking,
    listParkings,
    listOwnParkings,
    getParking,
    getParkingDetail,
    removeParking,
};
