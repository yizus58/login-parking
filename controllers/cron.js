const cron = require('node-cron');
const { VehiclesOutParking } = require("../controllers/vehiclesLog");

const task = cron.schedule('59 23 * * *', () => {
    console.log('Ejecutado 11:59 PM America/Bogota', new Date().toISOString());

}, {
    scheduled: true,
    timezone: 'America/Bogota',
});

if (task) console.log('Cron job iniciado');