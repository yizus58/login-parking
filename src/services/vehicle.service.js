'use strict';

const { getConfig } = require('../config/env');
const { getModels, VEHICLE_STATUS } = require('../models');
const { billableHours, stayCost } = require('../utils/billing');
const { conflict, notFound } = require('../utils/errors');
const { normalizePlate } = require('../utils/plate');
const { formatDateTime } = require('../utils/time');
const { getAccessibleParking } = require('./parking.service');

/** Vehicle stay as returned by the API: UTC instants plus the same times in APP_TIMEZONE. */
function toStayResponse(vehicle, extra = {}) {
    const { timeZone } = getConfig();
    const data = vehicle.toJSON ? vehicle.toJSON() : { ...vehicle };
    return {
        ...data,
        entry_time_local: data.entry_time ? formatDateTime(data.entry_time, timeZone) : null,
        exit_time_local: data.exit_time ? formatDateTime(data.exit_time, timeZone) : null,
        time_zone: timeZone,
        ...extra,
    };
}

/**
 * Registers the entry of a vehicle in a parking operated by `user`. The parking row is
 * locked so two entries cannot exceed the capacity; a plate can only be inside once.
 */
async function registerEntry(user, { id_parking, vehicle_plate, model_vehicle }, now = new Date()) {
    const { Vehicle, sequelize } = getModels();
    const plate = normalizePlate(vehicle_plate);

    const vehicle = await sequelize.transaction(async (transaction) => {
        const parking = await getAccessibleParking(user, id_parking, { transaction, lock: transaction.LOCK.UPDATE });

        const inside = await Vehicle.findOne({
            where: { plate_number: plate, status: VEHICLE_STATUS.IN },
            transaction,
        });
        if (inside) {
            throw conflict(
                inside.id_parking === parking.id
                    ? 'No se puede Registrar Ingreso, el vehículo ya se encuentra dentro del parqueadero'
                    : 'No se puede Registrar Ingreso, ya existe la placa en otro parqueadero',
            );
        }

        const occupied = await Vehicle.count({
            where: { id_parking: parking.id, status: VEHICLE_STATUS.IN },
            transaction,
        });
        if (occupied >= parking.capacity) {
            throw conflict('El parqueadero no tiene suficiente espacio disponible, por favor revise el listado del parqueadero');
        }

        return Vehicle.create(
            {
                id_parking: parking.id,
                plate_number: plate,
                model_vehicle,
                entry_time: now,
                cost_per_hour: parking.cost_per_hour,
                id_admin: user.id,
                status: VEHICLE_STATUS.IN,
            },
            { transaction },
        );
    });

    return toStayResponse(vehicle);
}

/** Registers the exit and returns the cost (rate fixed at entry, started hours). */
async function registerExit(user, { id_parking, vehicle_plate }, now = new Date()) {
    const { Vehicle, sequelize } = getModels();
    const plate = normalizePlate(vehicle_plate);

    const vehicle = await sequelize.transaction(async (transaction) => {
        const parking = await getAccessibleParking(user, id_parking, { transaction });
        const stay = await Vehicle.findOne({
            where: { id_parking: parking.id, plate_number: plate, status: VEHICLE_STATUS.IN },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!stay) throw notFound('No se puede Registrar Salida, no existe la placa en el parqueadero');
        return stay.update({ exit_time: now, status: VEHICLE_STATUS.OUT }, { transaction });
    });

    return toStayResponse(vehicle, {
        hours_charged: billableHours(vehicle.entry_time, vehicle.exit_time),
        total_cost: stayCost(vehicle.entry_time, vehicle.exit_time, vehicle.cost_per_hour),
    });
}

module.exports = { registerEntry, registerExit, toStayResponse };
