/**
 * Create and export configuration variables
 */

// Container for all environments
const environments = {}

// Staging environment (default)
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'stagingHashSecret',
  maxChecks: 5,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromPhone: process.env.TWILIO_FROM_PHONE,
  },
}

// Production environment
environments.production = {
  httpPort: 8880,
  httpsPort: 8888,
  envName: 'production',
  hashingSecret: 'productionHashSecret',
  maxChecks: 5,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromPhone: process.env.TWILIO_FROM_PHONE,
  },
}

// Get environment from command line argument
const currentEnv = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

// Set config of environment
const envConfig = typeof (environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging

module.exports = envConfig