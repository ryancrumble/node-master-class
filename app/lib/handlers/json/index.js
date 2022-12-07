/**
 * @module JSONHandlers
 *
 */

const checks = require('./checks')
const tokens = require('./tokens')
const users = require('./users')
const ping = require('./ping')
const notFound = require('./notFound')

module.exports = {
  checks,
  tokens,
  users,
  ping,
  notFound,
}