/**
 * @module ServerLibrary
 * @desc Server related tasks
 */

// Dependencies
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const StringDecoder = require('string_decoder').StringDecoder
const url = require('url')
const util = require('util')
const debug = util.debuglog('server')

const config = require('./config')
const handlers = require('./handlers')
const helpers = require('./helpers')
const router = require('./router')

// Unified Server
const unifiedServer = (req, res) => {
  // Get and parse the url
  const parsedUrl = url.parse(req.url, true)

  // Get the path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  // Get the query string as an object
  // NOTE: not working with curl command
  const queryStringObject = parsedUrl.query

  // Get the http method
  const method = req.method.toLowerCase()

  // Get the headers as an object
  const headers = req.headers

  // Get the payload, if present
  const decoder = new StringDecoder('utf-8')
  let buffer = ''

  req.on('data', (data) => {
    buffer += decoder.write(data)
  })

  req.on('end', () => {
    buffer += decoder.end()

    /**
     * @desc Get selected handler for route
     * @default calls NotFoundHandler
     * @type {(function(data: any, callback: (statusCode: string,
     *     payload?: any) => void): void)}
     */
    let chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound

    // If the request is within a public dir, use the public handler instead
    chosenHandler = trimmedPath.includes('public/') ? handlers.public : chosenHandler

    const _data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    }

    // Route the request to the handler specified in the router
    /**
     * @param _data {any}
     * @param callback {(statusCode?: number, payload?: string | object,
     *   contentType?: string) => void}
     * @return {void}
     */
    chosenHandler(_data, (statusCode, payload, contentType) => {
      // Determine type of response, fallback to JSON
      contentType = typeof contentType === 'string' ? contentType : 'json'

      // Use status code called back by handler or default
      statusCode = typeof (statusCode) === 'number' ? statusCode : 200

      // Return the response parts that are content specific
      switch (contentType) {
        case 'json':
          res.setHeader('Content-Type', 'application/json')
          payload = JSON.stringify(typeof (payload) === 'object' ? payload : {})
          break
        case 'html':
          res.setHeader('Content-Type', 'text/html')
          payload = typeof (payload) === 'string' ? payload : ''
          break
        case 'favicon':
          res.setHeader('Content-Type', 'image/x-icon')
          payload = typeof (payload) !== 'undefined' ? payload : ''
          break
        case 'css':
          res.setHeader('Content-Type', 'text/css')
          payload = typeof (payload) !== 'undefined' ? payload : ''
          break
        case 'png':
          res.setHeader('Content-Type', 'image/png')
          payload = typeof (payload) !== 'undefined' ? payload : ''
          break
        case 'jpeg':
          res.setHeader('Content-Type', 'image/jpeg')
          payload = typeof (payload) !== 'undefined' ? payload : ''
          break
        case 'plain':
          res.setHeader('Content-Type', 'text/plain')
          payload = typeof (payload) !== 'undefined' ? payload : ''
          break
        default:
          res.setHeader('Content-Type', 'application/json')
          payload = JSON.stringify(typeof (payload) === 'object' ? payload : {})
      }

      // Return the response parts that are common to all content types
      res.writeHead(statusCode)
      res.end(payload)

      // If the response is 200 print green, otherwise print red
      if (statusCode !== 200) {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
      } else {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
      }
    })
  })
}

const httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
}

function init() {
// Instantiate HTTP server
  const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
  })

  const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res)
  })

// Start the HTTP server
  httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `Server is listening on port ${config.httpPort}`)
  })

  // Start the HTTPS server
  httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `Server is listening on port ${config.httpsPort}`)
  })
}

module.exports = {
  init,
}