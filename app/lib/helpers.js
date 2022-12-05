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


/**
 * @name CreateRandomString
 * @desc Generate a random string
 * @param stringLength {number}
 */
helpers.createRandomString = function (stringLength) {
    if (!stringLength) {
        return false;
    }

    // Declare all characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let str = '';
    for (let i = 0; i < stringLength; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
};

module.exports = helpers;