/**
 * @module CommonHandlers
 */

/**
 * @name PingHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
function ping(data, callback) {
  // Callback http status code and a payload object
  callback(200)
}

/**
 * @name NotFoundHandler
 * @param data {any}
 * @param callback {function}
 */
function notFound(data, callback) {
  callback(404)
}

module.exports = {
  notFound,
  ping,
}