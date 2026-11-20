'use strict';

const { createLogger, transports, format } = require('winston');

/** JSON logs on stdout (the platform collects them). LOG_LEVEL=debug for SQL and details, silent for none. */
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info');

const logger = createLogger({
    level: level === 'silent' ? 'error' : level,
    silent: level === 'silent',
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [new transports.Console()],
});

module.exports = logger;
