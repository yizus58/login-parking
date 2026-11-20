'use strict';

const MINUTE_MS = 60 * 1000;

/**
 * Hours charged for a stay: started hours, counted on whole minutes (the rule the API has
 * always used): 0 min -> 0 h, 1-60 min -> 1 h, 61-120 min -> 2 h ...
 */
function billableHours(entryTime, exitTime) {
    const minutes = Math.floor(Math.max(0, new Date(exitTime) - new Date(entryTime)) / MINUTE_MS);
    return Math.ceil(minutes / 60);
}

/** Cost of a stay rounded to cents. */
function stayCost(entryTime, exitTime, costPerHour) {
    return roundMoney(billableHours(entryTime, exitTime) * Number(costPerHour || 0));
}

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

module.exports = { billableHours, stayCost, roundMoney };
