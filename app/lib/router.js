/**
 * @module RouterLibrary
 * @desc Router for all requests
 */

const handlers = require("./handlers");

module.exports = {
    ping: handlers.ping,
    checks: handlers.checks,
    tokens: handlers.tokens,
    users: handlers.users,
};
