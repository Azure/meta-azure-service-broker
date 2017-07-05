/*jshint camelcase: false */

'use strict';

var winston = require('winston');
var LOG_CONSTANTS = {
  'BROKER': 'Meta Azure Service Broker',
  'BROKER_DB': 'broker database',
  'COMMON': 'common'
};
module.exports.LOG_CONSTANTS = LOG_CONSTANTS;

function getLogger(moduleName) {
  if (winston['loggers']['loggers'].hasOwnProperty(moduleName)) {
    return winston.loggers.get(moduleName);
  }

  var winstonConfig = require('../../winston.json');
  winstonConfig['console']['label'] = moduleName;
  return winston.loggers.add(moduleName, winstonConfig);
}
module.exports.getLogger = getLogger;

var log = getLogger(LOG_CONSTANTS.COMMON);

var _ = require('underscore');
var uuid = require('uuid');
var util = require('util');
var S = require('string');
var HttpStatus = require('http-status-codes');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;
var deepExtend = require('deep-extend');

var validateConfigurations = function() {
  var requiredEnvNames = [
    'ENVIRONMENT', 'SUBSCRIPTION_ID', 'TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET',
    'SECURITY_USER_NAME', 'SECURITY_USER_PASSWORD',
    'AZURE_BROKER_DATABASE_PROVIDER', 'AZURE_BROKER_DATABASE_SERVER', 'AZURE_BROKER_DATABASE_USER', 'AZURE_BROKER_DATABASE_PASSWORD', 'AZURE_BROKER_DATABASE_NAME', 'AZURE_BROKER_DATABASE_ENCRYPTION_KEY'
  ];

  var missingParams = [];
  requiredEnvNames.forEach(function(requiredEnvName) {
    var value = process.env[requiredEnvName];
    if (_.isUndefined(value) || _.isEmpty(value)) {
      missingParams.push(requiredEnvName);
    }
  });
  if (missingParams.length > 0) {
    throw new Error(util.format('The broker configurations are set only via environment variables. Please make sure the following environment variables are set correctly: %s', missingParams.toString()));
  }

  if (process.env['AZURE_BROKER_DATABASE_ENCRYPTION_KEY'].length != 32) {
    throw new Error(util.format('Please make sure that the length of AZURE_BROKER_DATABASE_ENCRYPTION_KEY is 32.'));
  }

  // validate sql server
  if (process.env['AZURE_SQLDB_SQL_SERVER_POOL']) {
    var sqlServers = JSON.parse(process.env['AZURE_SQLDB_SQL_SERVER_POOL']);
    var params = ['resourceGroup', 'location', 'sqlServerName', 'administratorLogin', 'administratorLoginPassword'];

    sqlServers.forEach(function(sqlServer){

      params.forEach(function(param){
        if (!sqlServer[param]) {
          throw new Error(util.format('In AZURE_SQLDB_SQL_SERVER_POOL, "%j" configuration is missing prameter "%s".', sqlServer, param));
        }
      });

      // pcf-tile pass the value of administratorLoginPassword as {"secret": "<password>"}
      if (typeof sqlServer['administratorLoginPassword'] === 'object') {
        sqlServer['administratorLoginPassword'] = sqlServer['administratorLoginPassword']['secret'];
      }

      params.forEach(function(param){
        if (typeof sqlServer[param] !== 'string') {
          throw new Error(util.format('Please check %j in your broker configuration.', sqlServer));
        }
      });
    });
  }
  
  // validate JSON type in default parameters
  var envVarShouldBeJSON = [
    'DEFAULT_PARAMETERS_AZURE_REDISCACHE',
    'DEFAULT_PARAMETERS_AZURE_SERVICEBUS',
    'DEFAULT_PARAMETERS_AZURE_STORAGE',
    'DEFAULT_PARAMETERS_AZURE_COSMOSDB',
    'DEFAULT_PARAMETERS_AZURE_MYSQLDB',
    'DEFAULT_PARAMETERS_AZURE_POSTGRESQLDB',
    'DEFAULT_PARAMETERS_AZURE_SQLDB'
  ];
  envVarShouldBeJSON.forEach(function(envVarName) {
    if (process.env[envVarName]) {
      try {
        JSON.parse(process.env[envVarName]);
      } catch (ex) {
        log.error('error in parsing %s', envVarName);
        throw ex;
      }
    }
  });
};

module.exports.getConfigurations = function() {
  validateConfigurations();

  var config = {
    'azure': {
      'environment': process.env['ENVIRONMENT'],
      'subscriptionId': process.env['SUBSCRIPTION_ID'],
      'tenantId': process.env['TENANT_ID'],
      'clientId': process.env['CLIENT_ID'],
      'clientSecret': process.env['CLIENT_SECRET'],
    },
    'serviceBroker': {
      'credentials': {
        'authUser': process.env['SECURITY_USER_NAME'],
        'authPassword': process.env['SECURITY_USER_PASSWORD']
      }
    },
    'database': {
      'provider': process.env['AZURE_BROKER_DATABASE_PROVIDER'],
      'server': process.env['AZURE_BROKER_DATABASE_SERVER'],
      'user': process.env['AZURE_BROKER_DATABASE_USER'],
      'password': process.env['AZURE_BROKER_DATABASE_PASSWORD'],
      'database': process.env['AZURE_BROKER_DATABASE_NAME'],
      'encryptionKey': process.env['AZURE_BROKER_DATABASE_ENCRYPTION_KEY']
    },
    'privilege': {
      'sqldb': {
        'allowToCreateSqlServer': (process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'] === undefined || process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'] === 'true')
      }
    },
    'accountPool': {
      'sqldb': {
      }
    },
    'defaultSettings': {
      'sqldb': {
        'transparentDataEncryption': (process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'] === 'true')
      }
    }
  };

  // import sql admin accounts
  if (process.env['AZURE_SQLDB_SQL_SERVER_POOL']) {

    var sqlServerPool = config['accountPool']['sqldb'];
    var sqlServers = JSON.parse(process.env['AZURE_SQLDB_SQL_SERVER_POOL']);
    var params = ['resourceGroup', 'location', 'sqlServerName', 'administratorLogin', 'administratorLoginPassword'];

    sqlServers.forEach(function(sqlServer){

      // pcf-tile pass the value of administratorLoginPassword as {"secret": "<password>"}
      if (typeof sqlServer['administratorLoginPassword'] === 'object') {
        sqlServer['administratorLoginPassword'] = sqlServer['administratorLoginPassword']['secret'];
      }

      sqlServerPool[sqlServer['sqlServerName']] = {};
      params.forEach(function(param){
        if (param !== 'sqlServerName') {
          sqlServerPool[sqlServer['sqlServerName']][param] = sqlServer[param];
        }
      });
    });
  }

  return config;
};

module.exports.getEnvironment = function(environmentName) {
  var azureEnv;
  if (environmentName == 'AzureCloud') {
    azureEnv = AzureEnvironment.Azure;
  } else if (environmentName == 'AzureChinaCloud') {
    azureEnv = AzureEnvironment.AzureChina;
  } else {
    throw new Error(util.format('Environment %s is not supported', environmentName));
  }
  if (!S(azureEnv.resourceManagerEndpointUrl).endsWith('/')) {
    azureEnv.resourceManagerEndpointUrl = azureEnv.resourceManagerEndpointUrl + '/' ;
  }
  return azureEnv;
};

module.exports.API_VERSION = {
  AzureCloud: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01', // https://msdn.microsoft.com/en-us/library/azure/mt639413.aspx
    SQL: '2014-04-01-preview',           // https://msdn.microsoft.com/en-us/library/azure/mt163571.aspx
    DOCDB: '2015-04-08',                 // https://docs.microsoft.com/en-us/rest/api/documentdbresourceprovider/databaseaccounts
    STORAGE_ACCOUNT: '2016-01-01',       // https://docs.microsoft.com/en-us/rest/api/storagerp/storageaccounts#StorageAccounts_CheckNameAvailability
    REDIS:'2016-04-01',                  // https://docs.microsoft.com/en-us/rest/api/redis/redis
    MYSQL:'2017-04-30-preview',
    POSTGRESQL:'2017-04-30-preview',
    COSMOSDB: '2015-04-08'               // https://docs.microsoft.com/en-us/rest/api/documentdbresourceprovider/databaseaccounts
  },
  AzureChinaCloud: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01',
    SQL: '2014-04-01-preview',
    DOCDB: '2015-04-08',
    STORAGE_ACCOUNT: '2016-01-01',
    REDIS:'2016-04-01',
    COSMOSDB: '2015-04-08'
  }
};

module.exports.fixParametersWithDefaults = function (envVarName, parameters) {
  if (process.env[envVarName]) {
    var defaultParams = JSON.parse(process.env[envVarName]);
    // The right overwrites the left if conflict
    parameters = deepExtend(defaultParams, parameters);
  }
    
  var defaultResourceGroup = process.env['DEFAULT_RESOURCE_GROUP'];
  if (defaultResourceGroup) {
    if (_.isUndefined(parameters.resourceGroup)) {
      parameters.resourceGroup = defaultResourceGroup;
    }
  }
  var defaultLocation  = process.env['DEFAULT_LOCATION'];
  if (defaultLocation) {
    if (_.isUndefined(parameters.location)) {
      parameters.location = defaultLocation;
    }
  }
  
  return parameters;
};

module.exports.generateName = function (length) {
  var usernameLength = length;
  if (!usernameLength) usernameLength = 12;
  return 'u' + uuid.v4().replace(/-/g, '').slice(0,usernameLength - 1);
};

module.exports.generateStrongPassword = function (length) {
  
  var uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var lowercaseLetters = uppercaseLetters.toLowerCase();
  var numbers = '1234567890';
                
  var passwordLength = length;
  if (!passwordLength) passwordLength = 12;
  if (passwordLength < 8) {
    throw Error('Length is too short for a strong password.');
  }
                
  function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Fisher–Yates Shuffle
  Array.prototype.shuffle = function() {
    for (var i = this.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = this[i];
      this[i] = this[j];
      this[j] = temp;
    }
    return this;
  };
                
  var pwd = '';
  
  var upperLength = getRandomInt(1, passwordLength-2);
  pwd += _.sample(uppercaseLetters, upperLength).join('');
                
  var lowerLength = getRandomInt(1, passwordLength-upperLength-1);
  pwd +=  _.sample(lowercaseLetters, lowerLength).join('');
                
  var numLength = passwordLength - upperLength - lowerLength;
  pwd +=  _.sample(numbers, numLength).join('');
                
  pwd = pwd.split('')
           .shuffle()
           .join('');
  
  return pwd;
};


module.exports.logHttpResponse = function (res, operation, logBody) {
  if (!(log && res)) return;
  if (typeof log.debug !== 'function') return;

  var message = '';

  if (typeof operation === 'string') {
    message += util.format('receive from: %s\n', operation);
  }
  message += util.format('statusCode: %s\n', res.statusCode);

  if (res.headers) {
    // x-ms-client-request-id and client-request-id should be same, but they have different names in different services' responses
    var keys = ['x-ms-client-request-id', 'client-request-id', 'x-ms-request-id', 'x-ms-correlation-request-id', 'x-ms-routing-request-id'];
    var keysLen = keys.length;
    for (var i = 0; i < keysLen; i++) {
      if (res.headers[keys[i]]) {
        message += util.format('%s: %s\n', keys[i], res.headers[keys[i]]);
      }
    }
  }
  if (logBody) {
    if (res.body) {
      message += util.format('%s: %s\n', 'body', JSON.stringify(res.body));
    }
  } else {
    message += 'response.body cannot be logged because it may contain credentials.\n';
  }

  log.debug('HTTP Response: %s', message);
};

module.exports.mergeTags = function(tags) {
  var AZURE_TAGS = {
    'user-agent': 'meta-azure-service-broker'
  };
  if (_.isUndefined(tags)) {
    tags = {};
  }
  return _.extend(tags, AZURE_TAGS);
};

module.exports.verifyParameters = function(reqParams, reqParamsKey) {
  var missingParams = [];
  reqParamsKey.forEach(function(key) {
    if (!_.has(reqParams, key)) {
      missingParams.push(key);
    }
  });
  var errMsg = null;
  if (missingParams.length > 0) {
    errMsg = util.format('The parameters %j are missing.', missingParams);
  }
  return errMsg;
};

var doHandleServiceError = function(statusCode, message, callback) {
  var error = {
    statusCode: statusCode,
    description: message,
  };
  log.error('%j', error);
  callback(error);
};

module.exports.handleServiceError = function(err, callback) {
  if (_.has(err, 'statusCode')) {
    doHandleServiceError(err.statusCode, err.message, callback);
  } else {
    doHandleServiceError(HttpStatus.BAD_REQUEST, err.message, callback);
  }
};

module.exports.handleServiceErrorEx = doHandleServiceError;

var mergeCommonHeaders = module.exports.mergeCommonHeaders = function(message, headers) {
  var clientRequestId = uuid.v4();
  log.info('%s: Generating x-ms-client-request-id: %s', message, clientRequestId);
  var clientRequestIdHeaders = {
    'x-ms-client-request-id': clientRequestId,
    'x-ms-return-client-request-id': true
  };

  if (headers){
    return util._extend(headers, clientRequestIdHeaders);
  } else {
    log.warn('mergeCommonHeaders: headers parameter is undefined');
    return clientRequestIdHeaders;
  }
};

module.exports.generateCustomHeaders = function(message) {
  var options = {
    customHeaders: mergeCommonHeaders(message, {})
  };
  return options;
};

module.exports.formatErrorFromRes = function(res, callback) {
  var err = new Error(JSON.stringify(res.body));
  err.statusCode = res.statusCode;
  callback(err);
};
