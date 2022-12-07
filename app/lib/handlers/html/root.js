const helpers = require('../../helpers')

/**
 * @name RootHandler
 * @desc The index handler for the web application
 * @param data {any}
 * @param callback {(statusCode?: number, payload?: any, contentType?: 'json' |
 *   'html') => void}
 * @return {void}
 */
function rootHandler(data, callback) {
  // Reject any method that is NOT a 'get' method
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'This is the title',
    'head.description': 'This is the meta description',
    'body.title': 'Hello templated world!',
    'body.class': 'index',
  }

  // Read in a template as a string
  helpers.getTemplate('index', templateData, (err, rawTemplate) => {
    if (err || !rawTemplate) {
      return callback(500, undefined, 'html')
    }

    helpers.addUniversalTemplates(rawTemplate, templateData, (err, template) => {
      if (err || !template) {
        return callback(500, undefined, 'html')
      }

      return callback(200, template, 'html')
    })
  })
}

module.exports = rootHandler