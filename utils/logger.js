const { createLogger, transports, format } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console(),
        new transports.File({
            filename: 'info.log',
            level: 'info'
        }),

        new transports.File({
            filename: 'errors.log',
            level: 'error',
            format: format.combine(
                format.timestamp(),
                format.json(),
                format((info) => (info.level === 'error' || info.level === 'warn') ? info : false)()
            )
        })
    ]
});

module.exports = logger;