/**
 * Create and export configuration variables
 */

// Container for all environments
const environments = {};

// Staging environment (default)
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'stagingHashSecret'
};

// Production environment
environments.production = {
    httpPort: 8880,
    httpsPort: 8888,
    envName: 'production',
    hashingSecret: 'productionHashSecret'
};

// Get environment from command line argument
const currentEnv = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Set config of environment
const envConfig = typeof (environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;

module.exports = envConfig;