'use strict';

const { Storage } = require('../integrations/storage');
const { NotificationService } = require('./notification.service');

/** Process-wide integration instances (created on first use; replaceable in tests). */
let storage = null;
let notifications = null;

const getStorage = () => (storage ??= new Storage());
const getNotifications = () => (notifications ??= new NotificationService());

/** Tests only. */
function setIntegrations({ storage: s, notifications: n } = {}) {
    storage = s ?? null;
    notifications = n ?? null;
}

async function closeIntegrations() {
    await notifications?.close();
}

module.exports = { getStorage, getNotifications, setIntegrations, closeIntegrations };
