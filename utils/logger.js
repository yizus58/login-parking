const { createLogger, transports, format } = require('winston');

const logger = createLogger({
    level: 'error',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'errors.log' })
    ]
});

module.exports = logger;