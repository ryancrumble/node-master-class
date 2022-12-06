/**
 * @module TokensHandler
 *
 */

const _data = require('../data')
const helpers = require('../helpers')

/**
 * @name TokenCreateHandler
 * @param data {{phone: string, password: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
function postToken(data, callback) {
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
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
function getToken(data, callback) {
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
 * @param data {{id: string, extend: boolean}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
 function putToken(data, callback) {
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
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
function deleteToken(data, callback) {
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
 * @desc Verify if a tokenId is currently valid for a user
 * @param id {string}
 * @param phone {string}
 * @param callback {function(isValid: boolean)}
 */
function verifyToken(id, phone, callback) {
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

module.exports = {
  post: postToken,
  get: getToken,
  put: putToken,
  delete: deleteToken,
  verifyToken
}