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
var uuidv5 = require('uuid/v5');
var util = require('util');
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

  // validate space scoping
  if (process.env['SPACE_SCOPING_ENABLED']) {
    var scopingEnabled = process.env['SPACE_SCOPING_ENABLED'];
    if (scopingEnabled !== 'true' && scopingEnabled !== 'false') {
      throw new Error('SPACE_SCOPING_ENABLED must be true or false!');
    }
    // Originally planned to allow for manual space scoping postfix definition
    // if (scopingEnabled === true) {
    //   var namePostfix = process.env['SPACE_SCOPING_NAMEPOSTFIX'];
    //   if (!namePostfix) {
    //     throw new Error('If SPACE_SCOPING_ENABLED is set to true, then a name-postfix unique to the CF environment must be provided!');
    //   } else if(typeof namePostfix !== 'string') {
    //     throw new Error('SPACE_SCOPING_NAMEPOSTFIX must be a string without special characters and spaces!');
    //   }
    // }
  }

  // validate JSON type in default parameters
  var envVarShouldBeJSON = [
    'DEFAULT_PARAMETERS_AZURE_REDISCACHE',
    'DEFAULT_PARAMETERS_AZURE_SERVICEBUS',
    'DEFAULT_PARAMETERS_AZURE_STORAGE',
    'DEFAULT_PARAMETERS_AZURE_COSMOSDB',
    'DEFAULT_PARAMETERS_AZURE_MYSQLDB',
    'DEFAULT_PARAMETERS_AZURE_POSTGRESQLDB',
    'DEFAULT_PARAMETERS_AZURE_SQLDB',
    'DEFAULT_PARAMETERS_AZURE_SQLDB_FAILOVER_GROUP'
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
      },
      'spaceScopingEnabled': (process.env['SPACE_SCOPING_ENABLED'] === 'true') //,
      //'spaceScopingNamePostfix': process.env['SPACE_SCOPING_NAMEPOSTFIX']
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
  switch(environmentName) {
    case 'AzureCloud':
        azureEnv = AzureEnvironment.Azure;
        break;
    case 'AzureChinaCloud':
        azureEnv = AzureEnvironment.AzureChina;
        break;
    case 'AzureGermanCloud':
        azureEnv = AzureEnvironment.AzureGermanCloud;
        break;
    case 'AzureUSGovernment':
        azureEnv = AzureEnvironment.AzureUSGovernment;
        break;
    default:
        throw new Error(util.format('Environment %s is not supported', environmentName));
  }

  var len = azureEnv.resourceManagerEndpointUrl.length;
  if (azureEnv.resourceManagerEndpointUrl[len - 1] != '/') {
    azureEnv.resourceManagerEndpointUrl = azureEnv.resourceManagerEndpointUrl + '/' ;
  }
  return azureEnv;
};

module.exports.API_VERSION = {
  AzureCloud: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS: '2015-08-01',           // https://docs.microsoft.com/en-us/rest/api/servicebus/namespaces
    EVENT_HUBS: '2015-08-01',            // https://docs.microsoft.com/en-us/rest/api/eventhub/namespaces
    SQL: '2014-04-01-preview',           // https://msdn.microsoft.com/en-us/library/azure/mt163571.aspx
    SQLFG: '2015-05-01-preview',         // https://docs.microsoft.com/en-us/rest/api/sql/failovergroups
    DOCDB: '2015-04-08',                 // https://docs.microsoft.com/en-us/rest/api/documentdbresourceprovider/databaseaccounts
    STORAGE_ACCOUNT: '2016-01-01',       // https://docs.microsoft.com/en-us/rest/api/storagerp/storageaccounts#StorageAccounts_CheckNameAvailability
    REDIS: '2016-04-01',                 // https://docs.microsoft.com/en-us/rest/api/redis/redis
    MYSQL: '2017-12-01',
    POSTGRESQL: '2017-12-01',
    COSMOSDB: '2015-04-08'               // https://docs.microsoft.com/en-us/rest/api/documentdbresourceprovider/databaseaccounts
  },
  AzureChinaCloud: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01',
    SQL: '2014-04-01-preview',
    SQLFG: '2015-05-01-preview',
    DOCDB: '2015-04-08',
    STORAGE_ACCOUNT: '2016-01-01',
    REDIS: '2016-04-01'
  },
  AzureGermanCloud: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01',
    SQL: '2014-04-01-preview',
    SQLFG: '2015-05-01-preview',
    DOCDB: '2015-04-08',
    STORAGE_ACCOUNT: '2016-01-01',
    REDIS: '2016-04-01',
    COSMOSDB: '2015-04-08'
  },
  AzureUSGovernment: {
    AZURE_ACTIVE_DIRECTORY: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01',
    SQL: '2014-04-01-preview',
    SQLFG: '2015-05-01-preview',
    DOCDB: '2015-04-08',
    STORAGE_ACCOUNT: '2016-01-01',
    REDIS: '2016-04-01'
  }
};

module.exports.fixNamesIfSpaceScopingEnabled = function (serviceConfig) {
  // Reading the configuration settings
  var scopingEnabled = (process.env['SPACE_SCOPING_ENABLED'] === 'true');

  // Modifying the service catalog to ensure serivce names and IDs are unique for the space
  if (scopingEnabled) {
    // Reading the CF VCAP Application properties with the space ID
    var vcapApplication = JSON.parse(process.env['VCAP_APPLICATION']);
    var spaceId = vcapApplication.space_id;
    var spaceName = vcapApplication.space_name;

    // Update service names, service ids and plan ids to remain unique if broker is deployed in multiple spaces
    serviceConfig.id = uuidv5(serviceConfig.id, spaceId);
    serviceConfig.name = serviceConfig.name + '-' + spaceId; //brokerConfigurations.serviceBroker.spaceScopingNamePostfix.toLowerCase();
    serviceConfig.description = serviceConfig.description + ' (' + spaceName + ')'; //brokerConfigurations.serviceBroker.spaceScopingNamePostfix + ')';
    serviceConfig.plans.forEach(function (plan) {
      plan.id = uuidv5(plan.id, spaceId);
    });
  }

  return serviceConfig;
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

const crypto = require('crypto');
module.exports.generateStrongPassword = function () {
  var password;

  var uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var lowercaseLetters = uppercaseLetters.toLowerCase();
  var numbers = '1234567890';

  var containUppercase = false;
  var containLowercase = false;
  var containNumber = false;

  while ((containLowercase && containLowercase && containNumber) === false) {
    password = crypto.randomBytes(40).toString('base64');
    var i = password.length;
    while (i--) {
      containUppercase = containUppercase || (uppercaseLetters.indexOf(password[i]) != -1);
      containLowercase = containLowercase || (lowercaseLetters.indexOf(password[i]) != -1);
      containNumber = containNumber || (numbers.indexOf(password[i]) != -1);
    }
  }
  return password;
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
