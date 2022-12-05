/**
 * Request handlers
 *
 */

const helpers = require('./helpers')
const config = require('./config')
const _data = require('./data')
const { acceptableMethods, acceptableProtocols } = require('./constants')

// Define handlers
/**
 * @name Handler
 * @type {Object<string, function(data: any, callback: any) | Object.<string,
 *     function>>}
 */
const handlers = {}

/**
 * @name UsersHandler
 * @namespace UsersHandler
 * @param data {any | {method: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers.users = function(data, callback) {
  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Users methods container
/**
 *
 * @type {Object<string, function(data: any, callback: any)>}
 */
handlers._users = {}

/**
 * @name UsersCreateHandler
 * @namespace UsersHandler
 * @param data
 * @param callback {function(data: any, callback?: any)}
 * @return void
 */
handlers._users.post = function(data, callback) {
  /**
   * @type {firstName: string, lastName: string, phone: string, password:
   *     string, tosAgreement: boolean}
   */
  const { payload } = data

  // Check all required fields are submitted
  // Check that all required fields are filled out
  const firstName = typeof (payload.firstName) === 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false
  const lastName = typeof (payload.lastName) === 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false
  const phone = typeof (payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false
  const password = typeof (payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false
  const tosAgreement = typeof (payload.tosAgreement) === 'boolean' && payload.tosAgreement === true

  if (!firstName || !lastName || !phone || !password || !tosAgreement) {
    callback(400, { 'Error': 'Missing required fields' })
  } else {
    _data.read('users', phone, (err) => {
      if (!err) {
        return callback(400, { 'Error': 'A user with this phone number already exists.' })
      } else {
        // Hash password
        const hashedPassword = helpers.hash(password)

        if (!hashedPassword) {
          return callback(500, { 'Error': 'Could not hash the user\'s password.' })
        }

        // Create user
        const user = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement: true,
        }

        // Store user
        _data.create('users', phone, user, (err) => {
          if (err) {
            console.error(err)
            callback(500, { 'Error': 'A user with that phone number already exists.' })
          } else {
            callback(200)
          }
        })
      }
    })
  }
}

/**
 * @name UsersReadHandler
 * @namespace UsersHandler
 * @param data {any}
 * @param callback {function(data: any, callback: any)}
 * @return data
 */
handlers._users.get = function(data, callback) {
  const { headers, queryStringObject } = data
  const token = typeof (headers.token) === 'string' ? headers.token : false
  const phone = typeof (queryStringObject.phone) == 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false

  // Validate phone number
  if (!phone) {
    return callback(400, { 'Error': 'Missing required field - phone number' })
  }

  // Validate user is authorised
  handlers._tokens.verifyToken(token, phone, (isValidToken) => {
    if (!isValidToken) {
      return callback(403, { 'Error': 'Invalid token. Token may be expired or not provided.' })
    }

    _data.read('users', phone, (err, res) => {
      if (err || !res) {
        return callback(404, { 'Error': 'User not found' })
      } else {
        // Remove the hashed password from the user object before
        // returning it to the requester it to the request
        delete res.hashedPassword
        return callback(200, res)
      }
    })
  })


}

/**
 * @name UsersUpdateHandler
 * @namespace UsersHandler
 * @param data {{payload: {firstName?: string, lastName?: string, phone: string,
 *     password: string}}}
 * @param callback
 */
handlers._users.put = function(data, callback) {
  const { headers, payload } = data
  const token = typeof (headers.token) === 'string' ? headers.token : false
  const phone = typeof (payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false


  handlers._tokens.verifyToken(token, phone, (isValidToken) => {
    // Validate user is authorised
    if (!isValidToken) {
      return callback(403, { 'Error': 'Invalid token. Token may be expired or not provided.' })
    }

    // Validate phone
    if (!phone) {
      return callback(400, { 'Error': 'Missing required field - phone number' })
    }

    // Check for optional fields
    const firstName = typeof (payload.firstName) === 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false
    const lastName = typeof (payload.lastName) === 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false
    const password = typeof (payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false

    // Validate at least one optional field is provided
    if (!firstName && !lastName && !password) {
      return callback(400, { 'Error': 'At least one field is required to update.' })
    }

    return _data.read('users', phone, (err, userData) => {
      if (err || !userData) {
        return callback(400, { 'Error': 'The specified user does not exist.' })
      }

      if (firstName) {
        userData.firstName = firstName
      }

      if (lastName) {
        userData.lastName = lastName
      }

      if (password) {
        userData.password = helpers.hash(password)
      }

      // Update the stored files
      _data.update('users', phone, userData, (err) => {
        if (err) {
          console.error(err)
          return callback(500, { 'Error': 'Could not update the user' })
        } else {
          callback(200)
        }
      })
    })
  })
}

/**
 * @name UsersDeleteHandler
 * @namespace UsersHandler
 * @param data {any}
 * @param callback {function(statusCode: number, message?: any)}
 */
handlers._users.delete = function(data, callback) {
  const { headers, queryStringObject } = data
  const phone = typeof (queryStringObject.phone) === 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false
  const token = typeof (headers.token) === 'string' ? headers.token : false

  handlers._tokens.verifyToken(token, phone, (isValidToken) => {
    // Validate user is authorised
    if (!isValidToken) {
      return callback(403, { 'Error': 'Invalid token. Token may be expired or not provided.' })
    }

    // Validate phone number
    if (!phone) {
      return callback(400, { 'Error': 'Missing required field - phone number' })
    }

    _data.read('users', phone, (err, userData) => {
      if (err || !userData) {
        return callback(400, { 'Error': 'Could not find the specified user' })
      } else {
        // Remove the hashed password from the user object before
        // returning it to the requester it to the request
        _data.delete('users', phone, (err) => {
          if (err) {
            return callback(500, { 'Error': 'Could not delete the specified user' })
          } else {
            // Delete each of the checks associated with the user
            const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : []
            const checksToDelete = userChecks.length

            if (checksToDelete < 0) {
              // No checks to delete
              return callback(200)
            }

            let checksDeleted = 0;
            let deletionErrors = false;

            // Loop through checks
            userChecks.forEach((checkId) => {
              // Delete the check
              _data.delete('checks', checkId, (err) => {
                if (err) {
                  deletionErrors = true
                }
                checksDeleted++;

                if (checksDeleted === checksToDelete) {
                  if (deletionErrors) {
                    return callback(500, {'Error': "Errors encountered while attempting to delete user's checks. All user's checks may not be delete"})
                  }
                  return callback(200)
                }
              })
            })


          }
        })
      }
    })
  })
}

/**
 * @name TokensHandler
 * @namespace TokensHandler
 * @param data {any | {method: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers.tokens = function(data, callback) {
  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
}

handlers._tokens = {}

/**
 * @name TokenCreateHandler
 * @namespace TokensHandler
 * @param data {{phone: string, password: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.post = function(data, callback) {
  const { payload } = data

  const phone = typeof (payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false
  const password = typeof (payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false

  if (!phone || !password) {
    return callback(400, { 'Error': 'Missing required fields - phone and password' })
  }

  // Find the user
  _data.read('users', phone, (err, userData) => {
    if (err || !userData) {
      return callback(400, { 'Error': 'Could not find specified user.' })
    }

    // Validate password
    // Hash the 'sent password' and compare with 'stored hash password'
    const hashedPassword = helpers.hash(password)

    if (hashedPassword !== userData.hashedPassword) {
      return callback(400, { 'Error': 'Password does not match the specified user\'s password' })
    }

    // Create a new token with a random name.
    // Set expiration date 1 hour in future
    const tokenId = helpers.createRandomString(20)
    const tokenExpires = Date.now() + 1000 * 60 * 60
    const token = {
      phone,
      id: tokenId,
      expires: tokenExpires,
    }

    // Store the token
    _data.create('tokens', tokenId, token, (err) => {
      if (err) {
        return callback(500, { 'Error': 'Could not create new token.' })
      }

      return callback(200, token)
    })
  })
}
/**
 * @name TokenReadHandler
 * @namespace TokensHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.get = function(data, callback) {
  // Validation for phone number
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false

  if (!id) {
    return callback(400, { 'Error': 'Missing required field - id' })
  }

  _data.read('tokens', id, (err, res) => {
    if (err || !res) {
      return callback(404, { 'Error': 'Token not found' })
    } else {
      callback(200, res)
    }
  })
}

/**
 * @name TokenUpdateHandler
 * @namespace TokensHandler
 * @param data {{id: string, extend: boolean}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.put = function(data, callback) {
  const { payload } = data

  const id = typeof (payload.id) === 'string' && payload.id.trim().length === 20 ? payload.id.trim() : false
  const toExtend = typeof (payload.extend) === 'boolean' && payload.extend === true

  // Validate
  if (!id || !toExtend) {
    return callback(400, { 'Error': 'Invalid field(s) or missing field(s)' })
  }

  _data.read('tokens', id, (err, res) => {
    if (err || !res) {
      return callback(400, { 'Error': 'Token does not exist' })
    }

    // Validate token expiry date
    if (res.expires <= Date.now()) {
      return callback(400, { 'Error': 'Token has expired. It cannot be extended.' })
    }

    res.expires = Date.now() * 1000 * 60 * 60

    _data.update('tokens', id, res, (err) => {
      if (err) {
        return callback(500, { 'Error': 'Token expiration could not be updated.' })
      } else {
        return callback(200)
      }
    })
  })

}

/**
 * @name TokenDeleteHandler
 * @namespace TokensHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.delete = function(data, callback) {
  // Validation for phone number
  const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.length === 20 ? data.queryStringObject.id.trim() : false

  if (!id) {
    return callback(400, { 'Error': 'Missing required field - id' })
  }

  _data.read('tokens', id, (err, res) => {
    if (err || !res) {
      return callback(400, { 'Error': 'Could not find the specified token' })
    } else {
      // Remove the hashed password from the user object before returning
      // it to the requester it to the request
      _data.delete('tokens', id, (err) => {
        if (err) {
          return callback(500, { 'Error': 'Could not delete the token' })
        } else {
          callback(200)
        }
      })
    }
  })
}

/**
 * @name TokenVerifyHandler
 * @namespace TokensHandler
 * @desc Verify if a tokenId is currently valid for a user
 * @param id {string}
 * @param phone {string}
 * @param callback {function(isValid: boolean)}
 */
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Find token
  _data.read('tokens', id, (err, res) => {
    if (err || !res) {
      return callback(false)
    }

    // Validate token is for user and not expired
    if (res.phone !== phone || res.expires <= Date.now()) {
      return callback(false)
    }

    return callback(true)
  })
}


/**
 * @name ChecksHandler
 * @namespace ChecksHandler
 * @param data {any | {method: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers.checks = function(data, callback) {
  if (acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405)
  }
}

// Checks container
handlers._checks = {}


/**
 * @name WriteCheckHandler
 * @namespace ChecksHandler
 * @param data {{payload: {protocol: string, url: string, method: string,
 *     successCodes: number[], timeoutSeconds: number}, headers: {token:
 *     string}}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers._checks.post = function({ payload, headers }, callback) {
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
 * @namespace ChecksHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return function(statusCode: number, payload?: any) | void
 */
handlers._checks.get = function(data, callback) {
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
    handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
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
 * @namespace ChecksHandler
 * @param data {{payload: {id: string, protocol?: string, url?: string,
 *   method?: string, successCodes?: string[], timeoutSeconds?: number},
 *   headers: any}}
 * @param callback
 */
handlers._checks.put = function(data, callback) {
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
    handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
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
 * @namespace ChecksHandler
 * @param data {{payload: { id: string}}, headers: any, queryStringObject: any}
 * @param callback {function(statusCode: number, message?: any)}
 */
handlers._checks.delete = function(data, callback) {
  const { headers, queryStringObject } = data

  const id = typeof (queryStringObject.id) === 'string' && queryStringObject.id.trim().length === 20 ? queryStringObject.id.trim() : false
  const token = typeof (headers.token) === 'string' ? headers.token : false

  // Validate ID is provided
  if (!id) {
    return callback()
  }


  // Lookup the check to delete
  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) {
      return callback(400, { 'Error': 'Check ID does not exist' })
    }

    handlers._tokens.verifyToken(token, checkData.userPhone, (isValidToken) => {
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
            const positionOfCheck = userChecks.indexOf(id);

            if (positionOfCheck <= -1) {
              return callback(500, {'Error': "Could not find the check on the user's object"})
            }

            userChecks.splice(positionOfCheck, 1)

            // Update the user list of checks with new list of checks
            _data.update('users', checkData.userPhone, userData, (err) => {
              if (err) {
                return callback(500, { 'Error': 'Could not update the specified user' })

              } else {
                callback(200)
              }
            })
          }
        })
      })
    })
  })
}


/**
 * @name PingHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers.ping = function(data, callback) {
  // Callback http status code and a payload object
  callback(200)
}

/**
 * @name NotFoundHandler
 * @param data {any}
 * @param callback {function}
 */
handlers.notFound = function(data, callback) {
  callback(404)
}

module.exports = handlers