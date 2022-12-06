/**
 * @module PingHandlers
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

module.exports = ping