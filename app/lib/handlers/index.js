/**
 * @module Handlers
 *
 */

const checksHandler = require('./checks')
const tokensHandler = require('./tokens')
const usersHandler = require('./users')
const { notFound, ping } = require('./common')

module.exports = {
  checks: checksHandler,
  tokens: tokensHandler,
  users: usersHandler,
  ping,
  notFound
}