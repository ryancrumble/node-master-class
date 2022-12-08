/**
 * @desc Frontend Logic for application
 *
 */

// Container for the FE app
const app = {}

// Config
app.config = {
  sessionToken: false,
}

app.client = {}

/**
 * @name ClientRequest
 * @desc The interface for making API calls
 * @param headers {Object}
 * @param path {string}
 * @param method {'get' | 'post' | 'put' | 'delete'}
 * @param queryString {object}
 * @param payload {*}
 * @param callback {(statusCode: number, response: * | false) => void}
 */
app.client.request = function(headers, path, method, queryString, payload, callback) {
  // Set defaults
  headers = typeof headers === 'object' && !!headers ? headers : {}
  path = typeof path === 'string' ? path : '/'
  method = typeof method === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].includes(method) ? method : 'GET'
  queryString = typeof queryString === 'object' && !!queryString ? queryString : {}
  payload = typeof payload === 'object' && !!payload ? payload : {}
  callback = typeof callback === 'function' ? callback : null

  const requestUrl = [path, Object.values(queryString).join('&')].join('?')


  // Form the HTTP request as JSON type
  const xhr = new XMLHttpRequest()
  xhr.open(method, requestUrl, true)
  xhr.setRequestHeader('Content-Type', 'application/json')

  Object.values(headers).forEach(({
                                    key,
                                    val,
                                  }) => {
    xhr.setRequestHeader(key, val)
  })

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id)
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status
      const responseReturned = xhr.responseText

      // Callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned)
          callback(statusCode, parsedResponse)
        } catch (e) {
          callback(statusCode, false)
        }

      }
    }
  }

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload)
  xhr.send(payloadString)
}