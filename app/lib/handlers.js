/**
 * Request handlers
 *
 */

const helpers = require('./helpers');
const _data = require('./data');

// Define handlers
/**
 * @name Handler
 * @type {Object<string, function(data: any, callback: any) | Object.<string,
 *     function>>}
 */
const handlers = {};

/**
 * @name UsersHandler
 * @namespace UsersHandler
 * @param data {any | {method: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers.users = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.includes(data.method)) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Users methods container
/**
 *
 * @type {Object<string, function(data: any, callback: any)>}
 */
handlers._users = {};

/**
 * @name UsersCreateHandler
 * @namespace UsersHandler
 * @param data
 * @param callback {function(data: any, callback: any)}
 */
handlers._users.post = function (data, callback) {
    /**
     * @type {firstName: string, lastName: string, phone: string, password:
     *     string, tosAgreement: boolean}
     */
    const {payload} = data;

    // Check all required fields are submitted
    // Check that all required fields are filled out
    const firstName = typeof (payload.firstName) == 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
    const lastName = typeof (payload.lastName) == 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
    const phone = typeof (payload.phone) == 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false;
    const password = typeof (payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;
    const tosAgreement = typeof (payload.tosAgreement) == 'boolean' && payload.tosAgreement === true;

    if (!firstName || !lastName || !phone || !password || !tosAgreement) {
        callback(400, {'Error': 'Missing required fields'});
    } else {
        _data.read('users', phone, (err) => {
            if (!err) {
                callback(400, {'Error': 'A user with this phone number already exists.'});
            } else {
                // Hash password
                const hashedPassword = helpers.hash(password);

                if (!hashedPassword) {
                    return callback(500, {"Error": "Could not hash the user's password."});
                }

                // Create user
                const user = {
                    firstName,
                    lastName,
                    phone,
                    hashedPassword,
                    tosAgreement: true
                };

                // Store user
                _data.create('users', phone, user, (err) => {
                    if (err) {
                        console.error(err);
                        callback(500, {'Error': 'A user with that phone number already exists.'});
                    } else {
                        callback(200);
                    }
                });
            }
        });
    }
};

/**
 * @name UsersReadHandler
 * @namespace UsersHandler
 * @param data {any}
 * @param callback {function(data: any, callback: any)}
 * @return data
 */
handlers._users.get = function (data, callback) {
    const { headers, queryStringObject} = data;
    const token = typeof (headers.token) === 'string' ? headers.token : false;
    const phone = typeof (queryStringObject.phone) == 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false;

    // Validate phone number
    if (!phone) {
        return callback(400, {'Error': 'Missing required field - phone number'});
    }

    // Validate user is authorised
    handlers._tokens.verifyToken(token, phone, (isValidToken) => {
        if (!isValidToken) {
            return callback(403, {'Error': 'Invalid token. Token may be expired or not provided.'});
        }

        _data.read('users', phone, (err, res) => {
            if (err || !res) {
                return callback(404, {'Error': 'User not found'});
            } else {
                // Remove the hashed password from the user object before
                // returning it to the requester it to the request
                delete res.hashedPassword;
                callback(200, res);
            }
        });
    });


};

/**
 * @name UsersUpdateHandler
 * @namespace UsersHandler
 * @param data {{payload: {firstName?: string, lastName?: string, phone: string,
 *     password: string}}}
 * @param callback
 */
handlers._users.put = function (data, callback) {
    const { headers, payload} = data;
    const token = typeof (headers.token) === 'string' ? headers.token : false;
    const phone = typeof (payload.phone) == 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false;


    handlers._tokens.verifyToken(token, phone, (isValidToken) => {
        // Validate user is authorised
        if (!isValidToken) {
            return callback(403, {'Error': 'Invalid token. Token may be expired or not provided.'});
        }

        // Validate phone
        if (!phone) {
            return callback(400, {'Error': 'Missing required field - phone number'});
        }

        // Check for optional fields
        const firstName = typeof (payload.firstName) === 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
        const lastName = typeof (payload.lastName) === 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
        const password = typeof (payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

        // Validate at least one optional field is provided
        if (!firstName && !lastName && !password) {
            return callback(400, {'Error': 'At least one field is required to update.'});
        }

        return _data.read('users', phone, (err, userData) => {
            if (err || !userData) {
                return callback(400, {'Error': 'The specified user does not exist.'});
            }

            if (firstName) {
                userData.firstName = firstName;
            }

            if (lastName) {
                userData.lastName = lastName;
            }

            if (password) {
                userData.password = helpers.hash(password);
            }

            // Update the stored files
            _data.update('users', phone, userData, (err) => {
                if (err) {
                    console.error(err);
                    return callback(500, {'Error': 'Could not update the user'});
                } else {
                    callback(200);
                }
            });
        });
    });
};

// Users - delete
// @TODO Clean up (remove) and other data files associated with this users
/**
 * @name UsersDeleteHandler
 * @namespace UsersHandler
 * @param data {any}
 * @param callback {function(statusCode: number, message?: any)}
 */
handlers._users.delete = function (data, callback) {
    const { headers, queryStringObject } = data;
    const phone = typeof (queryStringObject.phone) == 'string' && queryStringObject.phone.trim().length === 10 ? queryStringObject.phone.trim() : false;
    const token = typeof (headers.token) === 'string' ? headers.token : false;

    handlers._tokens.verifyToken(token, phone, (isValidToken) => {
        // Validate user is authorised
        if (!isValidToken) {
            return callback(403, {'Error': 'Invalid token. Token may be expired or not provided.'});
        }

        // Validate phone number
        if (!phone) {
            return callback(400, {'Error': 'Missing required field - phone number'});
        }

        _data.read('users', phone, (err, res) => {
            if (err || !res) {
                return callback(400, {'Error': 'Could not find the specified user'});
            } else {
                // Remove the hashed password from the user object before returning
                // it to the requester it to the request
                _data.delete('users', phone, (err) => {
                    if (err) {
                        return callback(500, {'Error': 'Could not delete the specified user'});
                    } else {
                        callback(200);
                    }
                });
            }
        });
    });
};

/**
 * @name TokensHandler
 * @namespace TokensHandler
 * @param data {any | {method: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 * @return void
 */
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.includes(data.method)) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._tokens = {};

/**
 * @name TokenCreateHandler
 * @namespace TokensHandler
 * @param data {{phone: string, password: string}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.post = function (data, callback) {
    const {payload} = data;

    const phone = typeof (payload.phone) == 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false;
    const password = typeof (payload.password) == 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

    if (!phone || !password) {
        return callback(400, {'Error': 'Missing required fields - phone and password'});
    }

    // Find the user
    _data.read('users', phone, (err, userData) => {
        if (err || !userData) {
            return callback(400, {'Error': 'Could not find specified user.'});
        }

        // Validate password
        // Hash the 'sent password' and compare with 'stored hash password'
        const hashedPassword = helpers.hash(password);

        if (hashedPassword !== userData.hashedPassword) {
            return callback(400, {'Error': 'Password does not match the specified user\'s password'});
        }

        // Create a new token with a random name.
        // Set expiration date 1 hour in future
        const tokenId = helpers.createRandomString(20);
        const tokenExpires = Date.now() + 1000 * 60 * 60;
        const token = {
            phone,
            id: tokenId,
            expires: tokenExpires
        };

        // Store the token
        _data.create('tokens', tokenId, token, (err) => {
            if (err) {
                return callback(500, {'Error': 'Could not create new token.'});
            }

            return callback(200, token);
        });
    });
};
/**
 * @name TokenReadHandler
 * @namespace TokensHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.get = function (data, callback) {
    // Validation for phone number
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

    if (!id) {
        return callback(400, {'Error': 'Missing required field - id'});
    }

    _data.read('tokens', id, (err, res) => {
        if (err || !res) {
            return callback(404, {'Error': 'Token not found'});
        } else {
            callback(200, res);
        }
    });
};

/**
 * @name TokenUpdateHandler
 * @namespace TokensHandler
 * @param data {{id: string, extend: boolean}}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.put = function (data, callback) {
    const {payload} = data;

    const id = typeof (payload.id) === 'string' && payload.id.trim().length === 20 ? payload.id.trim() : false;
    const toExtend = typeof (payload.extend) === 'boolean' && payload.extend === true;

    // Validate
    if (!id || !toExtend) {
        return callback(400, {'Error': 'Invalid field(s) or missing field(s)'});
    }

    _data.read('tokens', id, (err, res) => {
        if (err || !res) {
            return callback(400, {'Error': 'Token does not exist'});
        }

        // Validate token expiry date
        if (res.expires <= Date.now()) {
            return callback(400, {'Error': 'Token has expired. It cannot be extended.'});
        }

        res.expires = Date.now() * 1000 * 60 * 60;

        _data.update('tokens', id, res, (err) => {
            if (err) {
                return callback(500, {'Error': 'Token expiration could not be updated.'});
            } else {
                return callback(200);
            }
        });
    });

};

/**
 * @name TokenDeleteHandler
 * @namespace TokensHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers._tokens.delete = function (data, callback) {
    // Validation for phone number
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.length === 20 ? data.queryStringObject.id.trim() : false;

    if (!id) {
        return callback(400, {'Error': 'Missing required field - id'});
    }

    _data.read('tokens', id, (err, res) => {
        if (err || !res) {
            return callback(400, {'Error': 'Could not find the specified token'});
        } else {
            // Remove the hashed password from the user object before returning
            // it to the requester it to the request
            _data.delete('tokens', id, (err) => {
                if (err) {
                    return callback(500, {'Error': 'Could not delete the token'});
                } else {
                    callback(200);
                }
            });
        }
    });
};

/**
 * @name TokenVerifyHandler
 * @namespace TokensHandler
 * @desc Verify if a tokenId is currently valid for a user
 * @param id {string}
 * @param phone {string}
 * @param callback {function(isValid: boolean)}
 */
handlers._tokens.verifyToken = function (id, phone, callback) {
    // Find token
    _data.read('tokens', id, (err, res) => {
        if (err || !res) {
            return callback(false);
        }

        // Validate token is for user and not expired
        if (res.phone !== phone || res.expires <= Date.now()) {
            return callback(false);
        }

        return callback(true);
    });
};

/**
 * @name PingHandler
 * @param data {any}
 * @param callback {function(statusCode: number, payload?: any)}
 */
handlers.ping = function (data, callback) {
    // Callback http status code and a payload object
    callback(200);
};

/**
 * @name NotFoundHandler
 * @param data {any}
 * @param callback {function}
 */
handlers.notFound = function (data, callback) {
    callback(404);
};

module.exports = handlers;