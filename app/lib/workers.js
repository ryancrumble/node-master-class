/**
 * Worker related tasks
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')

const _data = require('./data')
const {
  acceptableProtocols,
  acceptableMethods,
  checkState,
} = require('./constants')

/**
 * @desc Executes the worker process once a minute
 */
function loopChecks() {
  // Perform checks once a minute
  setInterval(() => {
    gatherAllChecks()
  }, 1000 * 60)
}

/**
 * @desc Initialise workers
 */
function init() {
  // Execute all the checks immediately
  gatherAllChecks()

  // Execute all the checks on a set interval
  loopChecks()
}

/**
 * @desc Looks up all checks and validates the data
 * @return void
 */
function gatherAllChecks() {
  // Get all checks in the system
  _data.list('checks', (err, checks) => {
    if (err || !checks || checks.length <= 0) {
      return console.error('Error: Could not find any checks to process', err)
    }

    checks.forEach((check) => {
      _data.read('checks', check, (err, checkData) => {
        if (err || !checkData) {
          return console.error('Error reading one of the check\'s data')
        }

        validateCheckData(checkData)
      })
    })

  })
}

/**
 * @desc Sanity checking the check data
 * @param data {{id: string, userPhone: string, url: string, protocol:
 *   string, method: string, successCodes: string[], timeoutSeconds: number,
 *   state: 'up' | 'down', lastChecked: string}}
 * @return void
 */
function validateCheckData(data) {
  const checkData = typeof data === 'object' && data !== null ? data : {}

  checkData.id = typeof checkData.id === 'string' && checkData.id.trim().length === 20 ? checkData.id : null
  checkData.userPhone = typeof checkData.userPhone === 'string' && checkData.userPhone.trim().length === 10 ? checkData.userPhone : null
  checkData.url = typeof checkData.url === 'string' && checkData.url.trim().length > 0 ? checkData.url : null
  checkData.protocol = typeof checkData.protocol === 'string' && acceptableProtocols.includes(checkData.protocol) ? checkData.protocol : null
  checkData.method = typeof checkData.method === 'string' && acceptableMethods.includes(checkData.method) ? checkData.method : null
  checkData.successCodes = typeof checkData.successCodes === 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : null
  checkData.timeoutSeconds = typeof checkData.timeoutSeconds === 'number' && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : null

  // Set keys for keys that workers have not seen before
  checkData.state = typeof checkData.state === 'string' && checkState.includes(checkData.state) ? checkData.state : 'down'
  checkData.lastChecked = typeof checkData.lastChecked === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : null

  if (!checkData.id || !checkData.userPhone || !checkData.url || !checkData.protocol || !checkData.method || !checkData.successCodes || !checkData.timeoutSeconds) {
    return console.error('One of the checks is not formatted correctly. Skipping it', checkData)
  }

  performCheck(checkData)
}

/**
 * @desc Perform the check and send data with check process
 * @param data {{id: string, userPhone: string, url: string, protocol:
 *   string, method: string, successCodes: string[], timeoutSeconds: number,
 *   state: 'up' | 'down', lastChecked: string}}
 */
function performCheck(data) {
  // Prepare initial check outcome
  const outcome = {
    error: null,
    responseCode: null,
  }

  // Mark that the outcome has not been sent yet
  let isOutcomeSent = false

  // Parse the hostname and path
  const parsedUrl = url.parse(data.protocol + '://' + data.url, true)
  const hostname = parsedUrl.hostname
  const path = parsedUrl.path // Using path (not 'pathname') because we want
  // the query string

  // Construct the request
  const requestDetails = {
    protocol: data.protocol + ':',
    hostname,
    method: data.method.toUpperCase(),
    path,
    timeout: data.timeoutSeconds * 1000,
  }

  function requestCallback(res) {
    // Update check outcome and pass data
    outcome.responseCode = res.statusCode

    if (!isOutcomeSent) {
      processCheckOutcome(data, outcome)
      isOutcomeSent = true
    }

    // Bind to error event so error is not thrown
    req.on('error', (e) => {
      // Update check outcome and pass data
      outcome.error = {
        error: true,
        value: e,
      }

      if (!isOutcomeSent) {
        processCheckOutcome(data, outcome)
        isOutcomeSent = true
      }
    })

    // Bind to the timeout event
    req.on('timeout', () => {
      // Update check outcome and pass data
      outcome.error = {
        error: true,
        value: 'timeout',
      }

      if (!isOutcomeSent) {
        processCheckOutcome(data, outcome)
        isOutcomeSent = true
      }
    })

  }

  // Instantiate the request object (using correct protocol module)
  const req = data.protocol === 'http' ?
    http.request(requestDetails, requestCallback) :
    https.request(requestDetails, requestCallback)

  // End the request
  req.end()
}


/**
 * @desc Process check outcome and (if needed) update check data and trigger an
 *   alert Special logic for accommodating a check that has never been tested
 *   (no alert fired)
 * @param data {{id: string, userPhone: string, url: string, protocol:
 *  string, method: string, successCodes: string[], timeoutSeconds: number,
 *  state: 'up' | 'down', lastChecked: string}}
 * @param outcome {{responseCode: number | null, error: {error: boolean, value:
 *   string | Error} | null}}
 */
function processCheckOutcome(data, outcome) {
  // Confirm if check is 'up' or 'down'
  const state = !outcome.error && data.successCodes.includes(outcome.responseCode.toString()) && data.successCodes ? 'up' : 'down'

  // Decide if an alert is warranted
  const shouldAlert = !!(data.lastChecked && data.state !== state)

  const newCheckData = {
    ...data,
    state,
    lastChecked: Date.now(),
  }

  // Save the updates to disk
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (err) {
      console.error('Error trying to save update to checks')
    } else {
      if (!shouldAlert) {
        console.log('Check outcome has not change, no alert needed.')
      } else {
        alertUserToStatusChange(newCheckData)
      }
    }
  })
}

/**
 * @desc Alert the user as to a change in their check status
 * @param data {{protocol: string, method: string, successCodes: string[],
 *   userPhone: string, timeoutSeconds: number, id: string, state: (string),
 *   lastChecked: number, url: string}}
 *  @return void
 */
function alertUserToStatusChange(data) {
  const message = `Alert: Your check for ${data.method.toUpperCase()} ${data.protocol}://${data.url} is currently ${data.state}`

  console.log(message)
  return console.log('Twilio SMS skipped due to auth error with API:')

  // helpers.sendTwilioSms(data.userPhone, message, (err) => {
  //   if (err) {
  //     console.error('Error: Could not send SMS alert to user regarding their check state change: ', err)
  //   } else {
  //     console.log('Success: User was alerted to a status change in their check, via SMS. Message: ', message)
  //   }
  // })
}


module.exports = {
  init,
}