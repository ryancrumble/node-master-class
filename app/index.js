/*
 * Primary file for the API
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const StringDecoder = require('string_decoder').StringDecoder;
const url = require('url');

const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
const router = require("./lib/router");

// Unified Server
const unifiedServer = (req, res) => {
    // Get and parse the url
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    // NOTE: not working with curl command
    const queryStringObject = parsedUrl.query;

    // Get the http method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if present
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();

        /**
         * @desc Get selected handler for route
         * @default calls NotFoundHandler
         * @type {(function(data: any, callback: function(statusCode: string,
         *     payload?: any)): void)}
         */
        const chosenHandler = typeof (router[trimmedPath]) !== "undefined" ? router[trimmedPath] : handlers.notFound;

        const _data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(_data, (statusCode, payload) => {
            // Use status code called back by handler or default
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            // Use payload called by handler or default
            payload = JSON.stringify(typeof (payload) == 'object' ? payload : {});

            // Return response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payload);

            // Log the request path
            console.log('Request received: ', method);
            console.log('On path: ', trimmedPath);
            console.log('Query parameters: ', queryStringObject);
            console.log('Headers: ', headers);
            console.log('Payload: ', buffer);
        });
    });
};

// Instantiate HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

// Instantiate HTTPS server
const httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem'),
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

// Start the servers
httpServer.listen(config.httpPort, () => {
    console.log(`Server is listening on port ${config.httpPort}`);
});

httpsServer.listen(config.httpsPort, () => {
    console.log(`Server is listening on port ${config.httpsPort}`);
});