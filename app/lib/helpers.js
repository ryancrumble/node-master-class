/**
 * Helpers for various tasks
 */

const crypto = require('crypto')
const config = require('./config')
const querystring = require('querystring')
const https = require('https')


/**
 * @name HashHelper
 * @desc Create a SHA256 hash
 * @param rawString {string}
 * @return {string|boolean}
 */
const hash = function(rawString) {
  if (typeof (rawString) !== 'string' || rawString.length <= 0) {
    return false
  }

  return crypto.createHmac('sha256', config.hashingSecret).update(rawString).digest('hex')
}

/**
 * @name ParseJSONToObject
 * @desc Parse a JSON string to an object in all cases, without throwing
 * @param string {string}
 * @return any | {} | undefined
 */
const parseJsonToObject = function(string) {
  try {
    return JSON.parse(string)
  } catch (e) {
    return {}
  }
}


/**
 * @name CreateRandomString
 * @desc Generate a random string
 * @param stringLength {number}
 */
const createRandomString = function(stringLength) {
  if (!stringLength) {
    return false
  }

  // Declare all characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let str = ''
  for (let i = 0; i < stringLength; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return str
}

/**
 *
 */
const sendTwilioSms = function(phone, message, callback) {
  // Validate params
  if (typeof phone !== 'string' || phone.trim().length !== 9) {
    return callback('Phone number is invalid. Please check the phone number is provided and the length of the number')
  }

  if (typeof message !== 'string' || message.trim().length <= 0 || message.trim().length > 1600) {
    return callback('Message is invalid. Please check the message is provided and within the valid length')
  }

  // Configure the API request payload
  const payload = {
    'From': config.twilio.fromPhone,
    'To': '+61' + phone,
    'Body': message,
  }

  // Stringify payload (from 'querystring' module, not JSON.stringify())
  // because the Content-Type is not application/JSON.
  const stringPayload = querystring.stringify(payload)


  // Configure the request details
  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
    auth: config.twilio.accountSid + ':' + config.twilio.authToken,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayload),
    },
  }

  // Instantiate the request object
  const req = https.request(requestDetails, (res) => {
    // Grab the status of the send request
    const status = res.statusCode

    // Callback depending on statusCod
    if (status !== 200 || status !== 201) {
      return callback(status + ' ' + res.statusMessage)
    }

    return callback(false)
  })


  // Bind to the error event to NOT throw an error
  req.on('error', (e) => callback(e))

  // Add the payload
  req.write(stringPayload)

  // End the request
  req.end()
}

module.exports = {
  hash,
  parseJsonToObject,
  createRandomString,
  sendTwilioSms,
}