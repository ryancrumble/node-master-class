const jsonHandlers = require('./json')
const htmlHandlers = require('./html')


module.exports = {
  ...jsonHandlers,
  ...htmlHandlers
}