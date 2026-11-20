'use strict';

/** User roles. ADMIN manages users and parkings; SOCIO (partner) operates its own parkings. */
const ROLES = Object.freeze({ ADMIN: 'ADMIN', SOCIO: 'SOCIO' });

module.exports = { ROLES, ROLE_VALUES: Object.values(ROLES) };
