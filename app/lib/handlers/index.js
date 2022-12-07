const jsonHandlers = require('./json')
const htmlHandlers = require('./html')
const publicHandlers = require('./public')


module.exports = {
  ...jsonHandlers,
  ...htmlHandlers,
  ...publicHandlers
}