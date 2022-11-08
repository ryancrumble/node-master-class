/**
 * Helpers for various tasks
 */

const crypto = require('crypto');
const config = require('./config');

// Container for helpers
const helpers = {};

/**
 * @name HashHelper
 * @desc Create a SHA256 hash
 * @param rawString {string}
 * @return {string|boolean}
 */
helpers.hash = function (rawString) {
    if (typeof (rawString) !== 'string' || rawString.length <= 0) {
        return false;
    }

    return crypto.createHmac('sha256', config.hashingSecret).update(rawString).digest('hex');
};


/**
 * @name ParseJSONToObject
 * @desc Parse a JSON string to an object in all cases, without throwing
 * @param string {string}
 * @return any | {} | undefined
 */
helpers.parseJsonToObject = function (string) {
    try {
        return JSON.parse(string);
    } catch (e) {
        return {};
    }
};

module.exports = helpers;