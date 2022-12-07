const helpers = require('../../helpers')

/**
 *
 * @param data
 * @param callback
 * @return {*}
 */
function favicon(data, callback) {
  // Reject any method that is NOT a 'get' method
  if (data.method !== 'get') {
    return callback(405)
  }

  // Read in favicon data
  helpers.getStaticAsset('favicon.ico', (err, data) => {
    if (err || !data) {
      return callback(500)
    }

    return callback(200, data, 'favicon')
  })
}

module.exports = favicon