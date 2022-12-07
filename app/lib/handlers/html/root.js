const helpers = require('../../helpers')

/**
 * @name RootHandler
 * @desc The index handler for the web application
 * @param data {any}
 * @param callback {(statusCode?: number, payload?: any, contentType?: 'json' | 'html') => void}
 * @return {void}
 */
function rootHandler(data, callback) {
  // Reject any method that is NOT a 'get' method
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Read in a template as a string
  helpers.getTemplate('index', (err, string) => {
    if (err || !string) {
      return callback(500, undefined, 'html');
    }

    return callback(200, string, 'html')
  })
}

module.exports = rootHandler