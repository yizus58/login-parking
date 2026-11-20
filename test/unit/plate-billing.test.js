'use strict';

const { normalizePlate } = require('../../src/utils/plate');
const { billableHours, stayCost, roundMoney } = require('../../src/utils/billing');

describe('normalizePlate', () => {
    it.each([
        ['abc123', 'ABC-123'],
        [' ABC-123 ', 'ABC-123'],
        ['a b c 1 2 3', 'ABC-123'],
        ['abc12d', 'ABC12D'],
    ])('%p -> %p', (raw, expected) => expect(normalizePlate(raw)).toBe(expected));

    it.each([
        ['AÑC123', 'La placa no puede contener la letra ñ'],
        ['añc123', 'La placa no puede contener la letra ñ'],
        ['AB*123', 'La placa no puede contener caracteres especiales'],
        ['AB12', 'La placa debe tener exactamente 6 caracteres alfanuméricos'],
        ['ABC1234', 'La placa debe tener exactamente 6 caracteres alfanuméricos'],
        [undefined, 'La placa debe tener exactamente 6 caracteres alfanuméricos'],
    ])('rejects %p', (raw, message) => {
        expect(() => normalizePlate(raw)).toThrow(expect.objectContaining({ status: 400, message }));
    });
});

describe('billing', () => {
    const entry = new Date('2026-03-10T10:00:00Z');
    const after = (minutes, seconds = 0) => new Date(entry.getTime() + (minutes * 60 + seconds) * 1000);

    it.each([
        [0, 0, 0],
        [0, 59, 0],
        [1, 0, 1],
        [60, 0, 1],
        [60, 59, 1],
        [61, 0, 2],
        [125, 0, 3],
    ])('%i min %i s -> %i started hours', (m, s, hours) => expect(billableHours(entry, after(m, s))).toBe(hours));

    it('never charges a negative stay', () => {
        expect(billableHours(entry, after(-10))).toBe(0);
    });

    it('multiplies by the rate and rounds to cents', () => {
        expect(stayCost(entry, after(90), 2500)).toBe(5000);
        expect(stayCost(entry, after(30), 1234.567)).toBe(1234.57);
        expect(stayCost(entry, after(30), null)).toBe(0);
        expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    });
});
