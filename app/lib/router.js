/**
 * @module RouterLibrary
 * @desc Router for all requests
 */

const handlers = require("./handlers");

module.exports = {
    '': handlers.index,
    // 'account/create': handlers.accountCreate,
    // 'account/edit': handlers.accountEdit,
    // 'account/deleted': handlers.accountDeleted,
    // 'session/create': handlers.sessionCreate,
    // 'session/deleted': handlers.sessionDeleted,
    // 'checks/all': handlers.checksList,
    // 'checks/create': handlers.checksCreate,
    // 'checks/edit': handlers.checksEdit,
    ping: handlers.ping,
    'api/checks': handlers.checks,
    'api/tokens': handlers.tokens,
    'api/users': handlers.users,
};
