/*jshint camelcase: false */

'use strict';

var _ = require('underscore');
var uuid = require('node-uuid');
var util = require('util');
var Net = require('net');
var Url = require('url');
var S = require('string');
var HttpStatus = require('http-status-codes');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;
var defaultConfig = require('../../config/default.json');

var fetchConfigFromEnv = function(configValue, envName) {
  if (_.isUndefined(process.env[envName]) || _.isEmpty(process.env[envName])) {
    return configValue;
  } else {
    return process.env[envName];
  }
};

module.exports.getConfigurations = function() {
  var newConfig = {
    'azure': {
      'environment': fetchConfigFromEnv(defaultConfig.azure.environment, 'ENVIRONMENT'),
      'subscriptionId': fetchConfigFromEnv(defaultConfig.azure.subscriptionId, 'SUBSCRIPTION_ID'),
      'tenantId': fetchConfigFromEnv(defaultConfig.azure.tenantId, 'TENANT_ID'),
      'clientId': fetchConfigFromEnv(defaultConfig.azure.clientId, 'CLIENT_ID'),
      'clientSecret': fetchConfigFromEnv(defaultConfig.azure.clientSecret, 'CLIENT_SECRET'),
    },
    'serviceBroker': {
      'credentials': {
        'authUser': fetchConfigFromEnv(defaultConfig.serviceBroker.credentials.authUser, 'SECURITY_USER_NAME'),
        'authPassword': fetchConfigFromEnv(defaultConfig.serviceBroker.credentials.authPassword, 'SECURITY_USER_PASSWORD')
      }
    },
    'database': {
      'provider': fetchConfigFromEnv(defaultConfig.database.server, 'AZURE_BROKER_DATABASE_PROVIDER'),
      'server': fetchConfigFromEnv(defaultConfig.database.server, 'AZURE_BROKER_DATABASE_SERVER'),
      'user': fetchConfigFromEnv(defaultConfig.database.user, 'AZURE_BROKER_DATABASE_USER'),
      'password': fetchConfigFromEnv(defaultConfig.database.password, 'AZURE_BROKER_DATABASE_PASSWORD'),
      'database': fetchConfigFromEnv(defaultConfig.database.database, 'AZURE_BROKER_DATABASE_NAME')
    }
  };
  return newConfig;
};

module.exports.validateConfigurations = function(config) {
  var configs = {
    'config.azure.environment': config.azure.environment,
    'config.azure.subscriptionId': config.azure.subscriptionId,
    'config.azure.tenantId': config.azure.tenantId,
    'config.azure.clientId': config.azure.clientId,
    'config.azure.clientSecret': config.azure.clientSecret,
    'config.serviceBroker.credentials.authUser': config.serviceBroker.credentials.authUser,
    'config.serviceBroker.credentials.authPassword': config.serviceBroker.credentials.authPassword,
    'config.database.provider': config.database.provider,
    'config.database.server': config.database.server,
    'config.database.user': config.database.user,
    'config.database.password': config.database.password,
    'config.database.database': config.database.database,
  };
  var missingParams = [];
  var key;
  var value;
  for (key in configs) {
    if (configs.hasOwnProperty(key)) {
      value = configs[key];
      if (!value) {
        missingParams.push(key);
      }
    }
  }
  if (missingParams.length > 0) {
    throw new Error(util.format('please make sure the configurations are correct: %j',  missingParams));
  }
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
    TOKEN: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01', // https://msdn.microsoft.com/en-us/library/azure/mt639413.aspx
    SQL: '2014-04-01-preview',           // https://msdn.microsoft.com/en-us/library/azure/mt163571.aspx
    DOCDB: '2015-04-08'                  // https://azure.microsoft.com/en-us/documentation/articles/documentdb-automation-resource-manager-cli/
  },
  AzureChinaCloud: {
    TOKEN: '2015-05-01-preview',
    RESOURCE_GROUP: '2015-11-01',
    SERVICE_BUS_NAMESPACE: '2015-08-01',
    SQL: '2014-04-01-preview',
    DOCDB: '2015-04-08'
  }
};

module.exports.logHttpResponse = function (log, res, operation, logBody) {
  if (!(log && res)) return;
  if (typeof log.debug !== 'function') return;

  var message = '';
  
  if (typeof operation === 'string') {
    message += util.format('receive from: %s\n', operation);
  }
  
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

module.exports.DBConflictError = function(err) {
  this.err = err;
  return this;
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

var doHandleServiceError = function(log, statusCode, message, callback) {
  var error = {
    statusCode: statusCode,
    description: message,
  };
  log.error('%j', error);
  callback(error);
};

module.exports.handleServiceError = function(log, err, callback) {
  if (_.has(err, 'statusCode')) {
    doHandleServiceError(log, err.statusCode, err.message, callback);
  } else {
    doHandleServiceError(log, HttpStatus.BAD_REQUEST, err.message, callback);
  }
};

module.exports.handleServiceErrorEx = doHandleServiceError;

var mergeCommonHeaers = module.exports.mergeCommonHeaders = function(log, message, headers) {
  var clientRequestId = uuid.v4();
  log.info('%s: Generating x-ms-client-request-id: %s', message, clientRequestId);
  var clientRequestIdHeaders = {
    'x-ms-client-request-id': clientRequestId,
    'x-ms-return-client-request-id': true
  };

  return util._extend(headers, clientRequestIdHeaders);
};

module.exports.generateCustomHeaders = function(log, message) {
  var options = {
    customHeaders: mergeCommonHeaers(log, message, {})
  };
  return options;
};
