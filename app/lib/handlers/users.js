/**
 * @module UserHandlers
 *
 */

const helpers = require('../helpers')
const _data = require('../data')
const { verifyToken } = require('./tokens')
const { acceptableMethods } = require('../constants')

/**
 * @name UsersCreateHandler
 * @param data {{payload: {firstName: string, lastName: string, phone: string,
 *   password: string, tosAgreement: boolean}}}
 * @param callback {function(data: any, callback?: any)}
 * @return void
 */
function postUser(data, callback) {
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
 * @param data {any}
 * @param callback {function(data: any, callback: any)}
 * @return data
 */
function getUser(data, callback) {
  const { headers, queryStringObject } = data
  const token = typeof (headers.token) === 'string' ? headers.token : false
  const phone = typeof (queryStringObject.phone) == 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false

  // Validate phone number
  if (!phone) {
    return callback(400, { 'Error': 'Missing required field - phone number' })
  }

  // Validate user is authorised
  verifyToken(token, phone, (isValidToken) => {
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
 * @param data {{payload: {firstName?: string, lastName?: string, phone: string,
 *     password: string}}}
 * @param callback
 */
function putUser(data, callback) {
  const { headers, payload } = data
  const token = typeof (headers.token) === 'string' ? headers.token : false
  const phone = typeof (payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false


  verifyToken(token, phone, (isValidToken) => {
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
 * @param data {any}
 * @param callback {function(statusCode: number, message?: any)}
 */
function deleteUser(data, callback) {
  const { headers, queryStringObject } = data
  const phone = typeof (queryStringObject.phone) === 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false
  const token = typeof (headers.token) === 'string' ? headers.token : false

  verifyToken(token, phone, (isValidToken) => {
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

            let checksDeleted = 0
            let deletionErrors = false

            // Loop through checks
            userChecks.forEach((checkId) => {
              // Delete the check
              _data.delete('checks', checkId, (err) => {
                if (err) {
                  deletionErrors = true
                }
                checksDeleted++

                if (checksDeleted === checksToDelete) {
                  if (deletionErrors) {
                    return callback(500, { 'Error': 'Errors encountered while attempting to delete user\'s checks. All user\'s checks may not be delete' })
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

const _users = {
  post: postUser,
  get: getUser,
  put: putUser,
  delete: deleteUser,
}

const userHandler = function(data, callback) {
  if (acceptableMethods.includes(data.method)) {
    return _users[data.method](data, callback)
  } else {
    return callback(405)
  }
}

module.exports = userHandler