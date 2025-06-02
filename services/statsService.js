const { VehicleLog, Parking, sequelize } = require("../models");

const getTopVehicles = async () => {
    return await VehicleLog.findAll({
        attributes: ["plateNumber", [sequelize.fn("COUNT", sequelize.col("plateNumber")), "count"]],
        group: ["plateNumber"],
        order: [[sequelize.fn("COUNT", sequelize.col("plateNumber")), "DESC"]],
        limit: 10,
    });
};

const getEarningsByParking = async (parkingId) => {
    return await VehicleLog.findAll({
        attributes: [
            [sequelize.fn("SUM", sequelize.literal("EXTRACT(EPOCH FROM (exitTime - entryTime))/3600 * costPerHour")), "totalEarnings"]
        ],
        where: { parkingId },
    });
};

module.exports = { getTopVehicles, getEarningsByParking };