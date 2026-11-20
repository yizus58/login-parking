'use strict';

/** Entry point (Render and Docker run `node app.js`). */
const { start } = require('./src/server');

start().catch((error) => {
    // Configuration and database errors name the variables, never their values.
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
});
