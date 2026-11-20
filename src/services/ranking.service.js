'use strict';

const { QueryTypes } = require('sequelize');
const { getConfig } = require('../config/env');
const { getModels } = require('../models');
const { roundMoney, stayCost } = require('../utils/billing');
const { weekRange } = require('../utils/time');
const { getAccessibleParking } = require('./parking.service');

const select = (sql, replacements) => getModels().sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

/** The 10 plates with most stays, across all parkings. */
async function topVehicles() {
    const rows = await select(`
        SELECT plate_number,
               (array_agg(model_vehicle ORDER BY entry_time DESC))[1] AS model_vehicle,
               count(*)::int AS total_visits
        FROM vehicles
        GROUP BY plate_number
        ORDER BY total_visits DESC, plate_number ASC
        LIMIT 10`);
    return rows;
}

/** The 10 plates with most stays in one parking (an ADMIN any parking, a SOCIO its own). */
async function topVehiclesByParking(user, parkingId) {
    const parking = await getAccessibleParking(user, parkingId);
    const vehicles = await select(
        `
        SELECT plate_number,
               (array_agg(model_vehicle ORDER BY entry_time DESC))[1] AS model_vehicle,
               count(*)::int AS total_visits
        FROM vehicles
        WHERE id_parking = :parkingId
        GROUP BY plate_number
        ORDER BY total_visits DESC, plate_number ASC
        LIMIT 10`,
        { parkingId: parking.id },
    );
    return { parking: { id: parking.id, name: parking.name }, vehicles };
}

/** The 3 partners whose parkings registered most entries this week (Monday-Sunday, APP_TIMEZONE). */
async function topPartnersThisWeek(now = new Date()) {
    const { start, end } = weekRange(now, getConfig().timeZone);
    const partners = await select(
        `
        SELECT u.id, u.username AS partner_name, count(v.id)::int AS vehicle_count
        FROM users u
        JOIN parkings p ON p.id_partner = u.id
        JOIN vehicles v ON v.id_parking = p.id
        WHERE u.role = 'SOCIO' AND v.entry_time BETWEEN :start AND :end
        GROUP BY u.id, u.username
        ORDER BY vehicle_count DESC, u.username ASC
        LIMIT 3`,
        { start, end },
    );
    return { week_start: start, week_end: end, top_partners: partners };
}

/** The 3 parkings that earned most this week, counting the stays that ended this week. */
async function topParkingsThisWeek(now = new Date()) {
    const { start, end } = weekRange(now, getConfig().timeZone);
    const stays = await select(
        `
        SELECT v.id_parking, p.name, v.entry_time, v.exit_time, v.cost_per_hour
        FROM vehicles v JOIN parkings p ON p.id = v.id_parking
        WHERE v.status = 'OUT' AND v.exit_time BETWEEN :start AND :end`,
        { start, end },
    );
    const byParking = new Map();
    for (const stay of stays) {
        const entry = byParking.get(stay.id_parking) ?? { id: stay.id_parking, name: stay.name, total_earnings: 0, vehicle_count: 0 };
        entry.total_earnings += stayCost(stay.entry_time, stay.exit_time, stay.cost_per_hour);
        entry.vehicle_count += 1;
        byParking.set(stay.id_parking, entry);
    }
    const top = [...byParking.values()]
        .map((p) => ({ ...p, total_earnings: roundMoney(p.total_earnings) }))
        .sort((a, b) => b.total_earnings - a.total_earnings || a.id - b.id)
        .slice(0, 3);
    return { week_start: start, week_end: end, top_parkings: top };
}

module.exports = { topVehicles, topVehiclesByParking, topPartnersThisWeek, topParkingsThisWeek };
