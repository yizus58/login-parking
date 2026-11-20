'use strict';

const cors = require('cors');
const express = require('express');
const { getConfig } = require('./config/env');
const { apiRouter } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');

/** The Express application (no listening, no database connection: see server.js). */
function createApp() {
    const { corsOrigins } = getConfig();
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
    app.use(express.json({ limit: '100kb' }));

    app.get('/health', (_req, res) => res.json({ result: true, status: 'ok' }));
    app.use('/api', apiRouter());

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
