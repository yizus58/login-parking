'use strict';

const { validationResult, matchedData } = require('express-validator');
const { badRequest } = require('../utils/errors');

/**
 * Runs the express-validator chains, answers 400 with every error, and stores the validated
 * (sanitized) values in req.valid so controllers never read unvalidated input.
 */
const validate = (chains) => [
    ...chains,
    (req, _res, next) => {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, location: e.location, msg: e.msg }));
            throw badRequest(errors[0].msg, errors);
        }
        req.valid = matchedData(req, { includeOptionals: false });
        next();
    },
];

module.exports = { validate };
