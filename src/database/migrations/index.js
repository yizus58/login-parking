'use strict';

/** Ordered list of migrations. Add new ones at the end; never edit an applied one. */
module.exports = [require('./20260101000000-baseline'), require('./20260101000100-integrity-and-indexes')];
