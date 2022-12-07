const helpers = require('../../helpers')

/**
 *
 * @param data
 * @param callback
 * @return {*}
 */
function publicHandler(data, callback) {
  // Reject any method that is NOT a 'get' method
  if (data.method !== 'get') {
    return callback(405)
  }

  // Get filename being requested
  const trimmedAssetName = data.trimmedPath.replace('public/', '').trim()

  if (!trimmedAssetName.length) {
    return callback(404)
  }

  // Read in the asset's data
  helpers.getStaticAsset(trimmedAssetName, (err, data) => {
    if (err || !data) {
      return callback(500)
    }

    // Determine the content type (default to plain text)
    const contentType = function() {
      const _stringArray = trimmedAssetName.split('.')
      const fileExtension = _stringArray[_stringArray.length -1]
      console.log('fileExtension: ', fileExtension)

      switch (fileExtension) {
        case 'css':
          return 'css'
        case 'png':
          return 'png'
        case 'jpg' || 'jpeg':
          return 'jpeg'
        case 'ico':
          return 'favicon'
        default:
          return 'plain'
      }
    }()

    return callback(200, data, contentType)
  })

}

module.exports = publicHandler