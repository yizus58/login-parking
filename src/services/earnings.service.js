'use strict';

const { Op } = require('sequelize');
const { getConfig } = require('../config/env');
const { getModels, VEHICLE_STATUS } = require('../models');
const { roundMoney, stayCost } = require('../utils/billing');
const { badRequest, forbidden } = require('../utils/errors');
const { ROLES } = require('../models/roles');
const { localDateRange, parseDayMonthYear } = require('../utils/time');
const { getAccessibleParking } = require('./parking.service');

/**
 * Earnings of a partner's parking for the stays that ended between two days (DD-MM-YYYY,
 * both included, calendar days in APP_TIMEZONE).
 */
async function earningsByPeriod(user, { id_parking, start_date, end_date }) {
    if (user.role !== ROLES.SOCIO) throw forbidden('Solo los socios consultan las ganancias de sus parqueaderos');
    const from = parseDayMonthYear(start_date);
    const to = parseDayMonthYear(end_date);
    if (!from || !to) throw badRequest('Formato de fecha inválido. Use: DD-MM-YYYY');

    const { timeZone } = getConfig();
    const { start, end } = localDateRange(from, to, timeZone);
    if (start > end) throw badRequest('La fecha inicial debe ser menor que la fecha final');

    const parking = await getAccessibleParking(user, id_parking);
    const stays = await getModels().Vehicle.findAll({
        where: { id_parking: parking.id, status: VEHICLE_STATUS.OUT, exit_time: { [Op.between]: [start, end] } },
        attributes: ['entry_time', 'exit_time', 'cost_per_hour'],
    });

    const totalEarnings = stays.reduce((sum, s) => sum + stayCost(s.entry_time, s.exit_time, s.cost_per_hour), 0);
    return {
        period: `${start_date} to ${end_date}`,
        totalEarnings: roundMoney(totalEarnings),
        totalVehicles: stays.length,
        startDate: start,
        endDate: end,
        timeZone,
        parkingName: parking.name,
        costPerHour: parking.cost_per_hour,
    };
}

module.exports = { earningsByPeriod };
