/**
 * @module HelpersLibrary
 * @desc Helpers for various tasks
 */

const crypto = require('crypto')
const fs = require('fs')
const https = require('https')
const path = require('path')
const querystring = require('querystring')

const config = require('./config')

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
  if (typeof phone !== 'string' || phone.trim().length !== 10) {
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
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(stringPayload),
    },
  }

  // @NOTE Twilio api no longer working with request details.
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


/**
 *
 * @name GetTemplate
 * @desc Gets the string content of a template
 * @param name {string} Name of the template
 * @param callback {(error: string | false, template?: string) => void}
 * @return {void}
 */
function getTemplate(name, callback) {
  if (typeof name !== 'string' || !name.length) {
    return callback('A valid template name was not specified.')
  }

  const templatesDir = path.join(__dirname, '/../templates/')

  fs.readFile(templatesDir + name + '.html', 'utf-8', (err, template) => {
    if (err || !template || !template.length) {
      return callback('No template was found')
    }

    return callback(false, template)
  })
}

module.exports = {
  hash,
  parseJsonToObject,
  createRandomString,
  sendTwilioSms,
  getTemplate
}