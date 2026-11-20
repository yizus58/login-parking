'use strict';

const { badRequest } = require('./errors');

/**
 * Colombian plates: 6 letters/digits, dashes and spaces ignored, no "Ñ". Car plates
 * (3 letters + 3 digits) are stored as "ABC-123"; other formats (motorcycles "ABC12D") as typed.
 */
function normalizePlate(raw) {
    const compact = String(raw ?? '').replace(/[\s-]/g, '').toUpperCase();
    if (/Ñ/.test(compact)) throw badRequest('La placa no puede contener la letra ñ');
    if (/[^A-Z0-9]/.test(compact)) throw badRequest('La placa no puede contener caracteres especiales');
    if (compact.length !== 6) throw badRequest('La placa debe tener exactamente 6 caracteres alfanuméricos');
    return /^[A-Z]{3}\d{3}$/.test(compact) ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

module.exports = { normalizePlate };
