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

var validateConfigurations = function() {
  var requiredEnvNames = [
    'ENVIRONMENT', 'SUBSCRIPTION_ID', 'TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET',
    'SECURITY_USER_NAME', 'SECURITY_USER_PASSWORD',
    'AZURE_BROKER_DATABASE_PROVIDER', 'AZURE_BROKER_DATABASE_SERVER', 'AZURE_BROKER_DATABASE_USER', 'AZURE_BROKER_DATABASE_PASSWORD', 'AZURE_BROKER_DATABASE_NAME', 'AZURE_BROKER_DATABASE_ENCRYPTION_KEY'
  ];

  var missingParams = [];
  var value;
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
    }
  };
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
