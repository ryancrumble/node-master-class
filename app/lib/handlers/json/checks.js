/**
 * @module ChecksHandler
 *
 */

const { acceptableMethods, acceptableProtocols } = require('../../constants')
const _data = require('../../data')
const config = require('../../config')
const helpers = require('../../helpers')
const { verifyToken } = require('./tokens')


/**
 * @name WriteCheckHandler
 * @param data {{payload: {protocol: string, url: string, method: string,
 *     successCodes: number[], timeoutSeconds: number}, headers: {token:
 *     string}}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
function postChecks({ payload, headers }, callback) {
  const protocol = typeof (payload.protocol) === 'string' && acceptableProtocols.includes(payload.protocol) ? payload.protocol : false
  const method = typeof (payload.method) === 'string' && acceptableMethods.includes(payload.method) ? payload.method : false
  const url = typeof (payload.url) === 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false
  const successCodes = typeof (payload.successCodes) === 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false
  const timeoutSeconds = typeof (payload.timeoutSeconds) === 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false

  if (!protocol || !method || !url || !successCodes || !timeoutSeconds) {
    callback(400, { 'Error': 'Inputs are invalid. Check if all inputs are provided and valid.' })
  }

  const token = typeof (headers.token) === 'string' ? headers.token : false

  // Lookup the user by reading the token
  _data.read('tokens', token, (err, tokenData) => {
    if (err || !tokenData) {
      return callback(403)
    }

    const userPhone = tokenData.phone

    // Look up the user data
    _data.read('users', userPhone, (err, userData) => {
      if (err || !userData) {
        return callback(403)
      }

      const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []

      // Verify user has less than maxChecks per user
      if (userChecks.length >= config.maxChecks) {
        return callback(400, { 'Error': `User has maximum number of checks (${config.maxChecks})` })
      }

      // Create random ID for the check
      const checkId = helpers.createRandomString(20)

      // Check object
      const check = {
        id: checkId,
        userPhone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSeconds,
      }

      _data.create('checks', checkId, check, (err) => {
        if (err) {
          return callback(500, { 'Error': 'Could not create the new check' })
        }

        // Add checkId to user's object
        userData.checks = userChecks
        userData.checks.push(checkId)

        // Save user data
        _data.update('users', userPhone, userData, (err) => {
          if (err) {
            return callback(500, { 'Error': 'Could not update user with new check}' })
          }

          return callback(200, check)
        })
      })
    })

  })

}

/**
 * @name ReadCheckHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return function(statusCode: number, payload?: any) | void
 */
function getCheck(data, callback) {
  const { headers, queryStringObject } = data

  const id = typeof (queryStringObject.id) === 'string' && queryStringObject.id.trim().length === 20 ? queryStringObject.id.trim() : false

  // Validate phone number
  if (!id) {
    return callback(400, { 'Error': 'Missing required field - id' })
  }

  // Look up the check
  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) {
      return callback(404)
    }

    // Get token from headers
    const token = typeof (headers.token) === 'string' ? headers.token : false

    // Validate user is authorised and the user is the owner of the token (via
    // user phone number)
    verifyToken(token, checkData.userPhone, (isValidToken) => {
      if (!isValidToken) {
        return callback(403)
      } else {
        return callback(200, checkData)
      }
    })
  })
}

/**
 * @name ChecksUpdateHandler
 * @param data {{payload: {id: string, protocol?: string, url?: string,
 *   method?: string, successCodes?: string[], timeoutSeconds?: number},
 *   headers: any}}
 * @param callback
 */
function putCheck(data, callback) {
  const { payload, headers } = data

  // Check required fields
  const id = typeof (payload.id) === 'string' && payload.id.trim().length === 20 ? payload.id.trim() : false

  // Check optional fields
  const protocol = typeof (payload.protocol) === 'string' && acceptableProtocols.includes(payload.protocol) ? payload.protocol : false
  const method = typeof (payload.method) === 'string' && acceptableMethods.includes(payload.method) ? payload.method : false
  const url = typeof (payload.url) === 'string' && payload.url.trim().length > 0 ? payload.url.trim() : false
  const successCodes = typeof (payload.successCodes) === 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false
  const timeoutSeconds = typeof (payload.timeoutSeconds) === 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false

  // Validate required fields
  if (!id) {
    return callback(400, { 'Error': 'Missing required field - id' })
  }

  // Validate optional fields (must provide one)
  if (!protocol && !url && !!method && !successCodes && !timeoutSeconds) {
    return callback(400, { 'Error': 'Missing fields to update. Please provide at least one' })
  }

  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) {
      return callback(400, { 'Error': 'Check ID does not exist' })
    }

    // Get token from headers
    const token = typeof (headers.token) === 'string' ? headers.token : false

    // Validate user is authorised and the user is the owner of the token (via
    // user phone number)
    verifyToken(token, checkData.userPhone, (isValidToken) => {
      if (!isValidToken) {
        return callback(403)
      } else {
        // Update the check with optional fields
        if (protocol) {
          checkData.protocol = protocol
        }

        if (url) {
          checkData.url = url
        }

        if (method) {
          checkData.method = method
        }

        if (successCodes) {
          checkData.successCodes = successCodes
        }

        if (timeoutSeconds) {
          checkData.timeoutSeconds = timeoutSeconds
        }

        // Store the new updates
        _data.update('checks', id, checkData, (err) => {
          if (err) {
            return callback(500, { 'Error': 'Check could not be updated.' })
          }
          return callback(200)
        })

      }
    })
  })
}


/**
 * @name ChecksDeleteHandler
 * @param data {{payload: { id: string}}, headers: any, queryStringObject: any}
 * @param callback {function(statusCode: number, message?: any)}
 */
function deleteCheck(data, callback) {
  const { headers, queryStringObject } = data

  const id = typeof (queryStringObject.id) === 'string' && queryStringObject.id.trim().length === 20 ? queryStringObject.id.trim() : false
  const token = typeof (headers.token) === 'string' ? headers.token : false

  // Validate ID is provided
  if (!id) {
    return callback(400, { 'Error': 'No id provided' })
  }

  // Lookup the check to delete
  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) {
      return callback(400, { 'Error': 'Check ID does not exist' })
    }

    verifyToken(token, checkData.userPhone, (isValidToken) => {
      // Validate user is authorised
      if (!isValidToken) {
        return callback(403, { 'Error': 'Invalid token. Token may be expired or not provided.' })
      }

      // Delete check data
      _data.delete('checks', id, (err) => {
        if (err) {
          return callback(500, { 'Error': 'Could not find check' })
        }

        // Look up and user and delete check from user
        _data.read('users', checkData.userPhone, (err, userData) => {
          if (err || !userData) {
            return callback(400, { 'Error': 'Could not find user who created the check. Therefore, check data is not deleted from the user' })
          } else {

            const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []
            const positionOfCheck = userChecks.indexOf(id)

            if (positionOfCheck <= -1) {
              return callback(500, { 'Error': 'Could not find the check on the user\'s object' })
            }

            userChecks.splice(positionOfCheck, 1)

            // Update the user list of checks with new list of checks
            _data.update('users', checkData.userPhone, userData, (err) => {
              if (err) {
                return callback(500, { 'Error': 'Could not update the specified user' })

              } else {
                return callback(200)
              }
            })
          }
        })
      })
    })
  })
}

const _checks = {
  post: postChecks,
  get: getCheck,
  put: putCheck,
  delete: deleteCheck,
}

const checksHandler = function(data, callback) {
  if (acceptableMethods.includes(data.method)) {
    return _checks[data.method](data, callback)
  } else {
    return callback(405)
  }
}

module.exports = checksHandler