/**
 * Router for all requests
 */

const handlers = require("./handlers");

/**
 *
 * @type {Record<string, (function(data: any, callback: function(statusCode:
 *     string, payload?: any)): void)>}
 */
const router = {
    ping: handlers.ping,
    checks: handlers.checks,
    tokens: handlers.tokens,
    users: handlers.users,
};
module.exports = router;

