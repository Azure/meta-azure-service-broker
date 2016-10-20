/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require('azure-arm-resource');
var request = require('request');
var util = require('util');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var docDbClient = require('documentdb').DocumentClient;

var common = require('../../common/');
var token = require('../../common/token');

var azureProperties;
var environment;
var resourceClient;
var log;
var API_VERSIONS;
var resourceType = 'databaseAccounts';
var parentResourcePath = '';
var resourceProviderNamespace = 'Microsoft.DocumentDb';

exports.initialize = function(azure, logger) {
  log = logger;
  azureProperties = azure;
  API_VERSIONS = common.API_VERSION[azure.environment];
  environment = common.getEnvironment(azure.environment);
  
  var options = {
    environment: environment
  };

  var credentials = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);
  var subscriptionId = azure.subscriptionId;

  resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
};

exports.checkDocDbAccountExistence = function(resourceGroupName, docDbAccountName, callback) {
  var options = common.generateCustomHeaders(log, 'Docdb - checkDocDbAccountExistence');
  var resourceName = docDbAccountName;
  resourceClient.resources.checkExistence(resourceGroupName, resourceProviderNamespace, parentResourcePath,
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - checkDocDbAccountExistence', true);
    if (err) {
      return callback(err);
    }
    callback(null, result);
  });
};

exports.createDocDbAccount = function(resourceGroupName, docDbAccountName, params, callback) {
  var options = common.generateCustomHeaders(log, 'Docdb - createDocDbAccount');
  var resourceName = docDbAccountName;
  resourceClient.resources.createOrUpdate(resourceGroupName, resourceProviderNamespace, parentResourcePath,
    resourceType, resourceName, API_VERSIONS.DOCDB, params, options,
    function (err, result, request, response) {
      common.logHttpResponse(log, response, 'Docdb - createDocDbAccount', true);
      if (err) {
        return callback(err);
      }
      if (response.statusCode == HttpStatus.OK) {
        callback(null);
      } else {
        var e = new Error(JSON.stringify(response.body));
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  );
};

exports.getDocDbAccount = function(resourceGroupName, docDbAccountName, callback) {
  var resourceName = docDbAccountName;
  var options = common.generateCustomHeaders(log, 'Docdb - getDocDbAccount');
  resourceClient.resources.get(resourceGroupName, resourceProviderNamespace, parentResourcePath,
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - getDocDbAccount', true);
    if (err) {
      return callback(err);
    }
    if (response.statusCode == HttpStatus.OK) {
      callback(null, result);
    } else {
      var e = new Error(JSON.stringify(response.body));
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
};

exports.getToken = function(callback) {
  token.getToken(environment, azureProperties, API_VERSIONS.TOKEN, log, function (err, accessToken) {
    if (err) {
      callback(err);
    } else {
      callback(null, accessToken);
    }
  });
};

exports.getAccountKey = function(resourceGroupName, docDbAccountName, accessToken, callback) {
  request({
    url: util.format('%ssubscriptions/%s/resourcegroups/%s/providers/Microsoft.DocumentDB/databaseAccounts/%s/listKeys',
      environment.resourceManagerEndpointUrl, azureProperties.subscriptionId, resourceGroupName, docDbAccountName),
    qs: {'api-version' : API_VERSIONS.DOCDB},
    method: 'POST',
    headers: common.mergeCommonHeaders(log, 'Docdb - getAccountKey', {'Authorization': 'Bearer ' + accessToken})
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'Docdb - getAccountKey', false);
    if (err) {
      return callback(err);
    }
    if (response.statusCode == HttpStatus.OK) {
      var b = JSON.parse(body);
      callback(null, b.primaryMasterKey);
    } else {
      var e = new Error(JSON.stringify(body));
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
};

exports.createDocDbDatabase = function(documentEndpoint, masterKey, databaseName, callback) {
  
  var docDb = new docDbClient(documentEndpoint, {masterKey:masterKey});
  docDb.createDatabase({id:databaseName}, function(error, database, responseHeaders) {
    common.logHttpResponse(log, {'headers': responseHeaders}, 'Docdb - createDatabase', true);		
    callback(error, database);		
  });		
};

exports.deleteDocDbAccount = function(resourceGroupName, docDbAccountName, callback) {
  var resourceName = docDbAccountName;
  var options = common.generateCustomHeaders(log, 'Docdb - deleteDocDbAccount');
  resourceClient.resources.deleteMethod(resourceGroupName, resourceProviderNamespace, parentResourcePath, 
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - deleteDocDbAccount', true);
    if (err) {
      return callback(err);
    }
    if (response.statusCode == HttpStatus.ACCEPTED || response.statusCode == HttpStatus.NO_CONTENT) { // It returns status code 204 if the account is not existed
      callback(null, response.body);
    } else {
      var e = new Error(JSON.stringify(response.body));
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
};

