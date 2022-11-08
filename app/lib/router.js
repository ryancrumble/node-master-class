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
    users: handlers.users,
};

module.exports = router;