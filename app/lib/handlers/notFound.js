/**
 * @module NotFoundHandler
 */

/**
 * @name NotFoundHandler
 * @param data {any}
 * @param callback {function}
 */
function notFound(data, callback) {
  callback(404)
}

module.exports = notFound