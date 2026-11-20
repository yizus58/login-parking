'use strict';

const { Op } = require('sequelize');
const { getConfig } = require('../config/env');
const { getModels, VEHICLE_STATUS } = require('../models');
const { roundMoney, stayCost } = require('../utils/billing');
const { formatDate, formatDateTime, isoDate, parseDayMonthYear, previousDayRange, localDateRange, dayRange } = require('../utils/time');
const { badRequest } = require('../utils/errors');
const logger = require('../utils/logger');
const { dailySummaryHtml, dailyDetailHtml } = require('../templates/report-emails');
const { buildParkingReport, EXCEL_MIME } = require('./excel.service');
const { getAccessibleParking } = require('./parking.service');

/** Stays that ended in [start, end], with parking and partner. */
async function endedStays({ start, end }, where = {}) {
    const { Vehicle, Parking, User } = getModels();
    return Vehicle.findAll({
        where: { ...where, status: VEHICLE_STATUS.OUT, exit_time: { [Op.between]: [start, end] } },
        include: [
            {
                model: Parking,
                as: 'parking',
                attributes: ['id', 'name'],
                include: [{ model: User, as: 'partner', attributes: ['id', 'username', 'email'] }],
            },
        ],
        order: [['exit_time', 'ASC']],
    });
}

/** One entry per parking with stays in the range: partner, vehicle count and earnings. */
async function collectDailySummaries(range) {
    const byParking = new Map();
    for (const stay of await endedStays(range)) {
        const { parking } = stay;
        const entry = byParking.get(parking.id) ?? {
            id: parking.id,
            name: parking.name,
            partner: { id: parking.partner.id, username: parking.partner.username, email: parking.partner.email },
            vehicle_count: 0,
            total_earnings: 0,
        };
        entry.vehicle_count += 1;
        entry.total_earnings = roundMoney(entry.total_earnings + stayCost(stay.entry_time, stay.exit_time, stay.cost_per_hour));
        byParking.set(parking.id, entry);
    }
    return [...byParking.values()].sort((a, b) => b.total_earnings - a.total_earnings);
}

/** One entry per parking with every stay of the range (most expensive first). */
async function collectDailyDetails(range, where = {}) {
    const { timeZone } = getConfig();
    const byParking = new Map();
    for (const stay of await endedStays(range, where)) {
        const { parking } = stay;
        const entry = byParking.get(parking.id) ?? {
            user_id: parking.partner.id,
            username: parking.partner.username,
            email: parking.partner.email,
            parking_id: parking.id,
            parking: parking.name,
            vehicles: [],
        };
        entry.vehicles.push({
            vehicle_id: stay.id,
            plate_number: stay.plate_number,
            model_vehicle: stay.model_vehicle,
            day: formatDateTime(stay.exit_time, timeZone),
            total_cost: stayCost(stay.entry_time, stay.exit_time, stay.cost_per_hour),
        });
        byParking.set(parking.id, entry);
    }
    return [...byParking.values()]
        .map((entry) => {
            entry.vehicles.sort((a, b) => b.total_cost - a.total_cost);
            return {
                ...entry,
                total_vehicles: entry.vehicles.length,
                total_earnings: roundMoney(entry.vehicles.reduce((sum, v) => sum + v.total_cost, 0)),
            };
        })
        .sort((a, b) => b.total_earnings - a.total_earnings);
}

const safeFilePart = (value) => String(value || 'parqueadero').toLowerCase().replace(/[^\w-]+/g, '_').substring(0, 50);

/**
 * Excel of one parking for a day (DD-MM-YYYY, default today in APP_TIMEZONE), for its partner
 * or an admin.
 */
async function parkingDayExcel(user, parkingId, date, now = new Date()) {
    const { timeZone } = getConfig();
    let range = dayRange(now, timeZone);
    if (date) {
        const day = parseDayMonthYear(date);
        if (!day) throw badRequest('Formato de fecha inválido. Use: DD-MM-YYYY');
        range = localDateRange(day, day, timeZone);
    }
    const parking = await getAccessibleParking(user, parkingId);
    const [detail] = await collectDailyDetails(range, { id_parking: parking.id });
    const partner = await getModels().User.findByPk(parking.id_partner);
    const content = await buildParkingReport(
        detail ?? { username: partner?.username, parking: parking.name, vehicles: [], total_vehicles: 0, total_earnings: 0 },
    );
    return { content, filename: `reporte_${safeFilePart(parking.name)}_${isoDate(range.start, timeZone)}.xlsx`, contentType: EXCEL_MIME };
}

/**
 * The daily job: for the previous local day, e-mails every partner a summary per parking and
 * the Excel detail (uploaded to storage, sent as an attachment through api-mail). One failure
 * does not stop the others; the upload of a failed e-mail is deleted.
 */
async function runDailyReports({ notifications, storage, now = new Date() }) {
    const { timeZone, mail } = getConfig();
    const range = previousDayRange(now, timeZone);
    const day = formatDate(range.start, timeZone);
    const result = { summaries: { sent: 0, failed: 0 }, details: { sent: 0, failed: 0 } };

    for (const summary of await collectDailySummaries(range)) {
        try {
            await notifications.sendEmail({
                userId: summary.partner.id,
                recipients: [summary.partner.email],
                subject: mail.subject,
                html: dailySummaryHtml(summary, day),
            });
            result.summaries.sent++;
        } catch (error) {
            result.summaries.failed++;
            logger.error(`Daily summary for parking ${summary.id} failed: ${error.message}`);
        }
    }

    for (const detail of await collectDailyDetails(range)) {
        let key = null;
        try {
            const filename = `reporte_${safeFilePart(detail.parking)}_${isoDate(range.start, timeZone)}.xlsx`;
            key = await storage.upload(await buildParkingReport(detail), EXCEL_MIME);
            await notifications.sendEmail({
                userId: detail.user_id,
                recipients: [detail.email],
                subject: mail.subject,
                html: dailyDetailHtml(detail, day),
                attachments: [{ name_file: filename, s3_name: key }],
            });
            result.details.sent++;
        } catch (error) {
            result.details.failed++;
            logger.error(`Daily detail for parking ${detail.parking_id} failed: ${error.message}`);
            if (key) await storage.remove(key).catch(() => undefined);
        }
    }

    logger.info(`Daily reports for ${day}: ${JSON.stringify(result)}`);
    return result;
}

module.exports = { collectDailySummaries, collectDailyDetails, parkingDayExcel, runDailyReports };
