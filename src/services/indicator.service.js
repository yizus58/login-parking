'use strict';

const { QueryTypes } = require('sequelize');
const { getModels } = require('../models');
const { ROLES } = require('../models/roles');

/**
 * Vehicles inside right now that are parking for the first time (their plate has no other
 * stay). An ADMIN sees every parking, a SOCIO only its own.
 */
async function firstTimeVehicles(user) {
    const onlyOwn = user.role !== ROLES.ADMIN;
    const rows = await getModels().sequelize.query(
        `
        SELECT v.plate_number, v.model_vehicle, v.entry_time, p.id AS parking_id, p.name AS parking_name
        FROM vehicles v
        JOIN parkings p ON p.id = v.id_parking
        WHERE v.status = 'IN'
          AND NOT EXISTS (SELECT 1 FROM vehicles o WHERE o.plate_number = v.plate_number AND o.id <> v.id)
          ${onlyOwn ? 'AND p.id_partner = :partnerId' : ''}
        ORDER BY v.entry_time ASC`,
        { replacements: { partnerId: user.id }, type: QueryTypes.SELECT },
    );
    return rows.map(({ parking_id, parking_name, ...vehicle }) => ({ ...vehicle, parking: { id: parking_id, name: parking_name } }));
}

module.exports = { firstTimeVehicles };
