/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require('azure-arm-resource');
var async = require('async');
var request = require('request');
var util = require('util');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var common = require('../../common/');
var token = require('../../common/token');

var azure_properties;
var resourceClient;
var options = {};
var log;
var API_VERSIONS;
var resourceType = 'databaseAccounts';
var parentResourcePath = '';
var resourceProviderNamespace = 'Microsoft.DocumentDb';

exports.initialize = function(azure, logger) {
  log = logger;
  azure_properties = azure;

  options.environment = common.getEnvironment(azure.environment);
  API_VERSIONS = common.API_VERSION[azure.environment];

  var credentials = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);
  var subscriptionId = azure.subscriptionId;

  resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
};

function checkDocDbAccountExistence(resourceGroupName, docDbAccountName, params, callback) {
  var options = common.generateCustomHeaders(log, 'Docdb - checkDocDbAccountExistence');
  var resourceName = docDbAccountName;
  resourceClient.resources.checkExistence(resourceGroupName, resourceProviderNamespace, parentResourcePath,
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - checkDocDbAccountExistence', true);
    if (err) {
      return callback(err);
    }
    if (result) {
      var error = new Error('The docDb account name is not available.');
      error.statusCode = HttpStatus.CONFLICT;
      callback(error);
    } else {
      callback(null, resourceGroupName, docDbAccountName, params);
    }
  });
}

function createDocDbAccount(resourceGroupName, docDbAccountName, params, callback) {
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
}

exports.provision = function(resourceGroupName, docDbAccountName, location, callback) {
  var params = {
    'location': location,
    'properties': {
      'Name': docDbAccountName,
      'databaseAccountOfferType': 'Standard'
    }
  };
  params = common.mergeTags(params);
  async.waterfall([
    async.constant(resourceGroupName, docDbAccountName, params),
    checkDocDbAccountExistence,
    createDocDbAccount
  ], function(err) {
    callback(err);
  });
};

function getDocDbAccount(resourceGroupName, docDbAccountName, callback) {
  var resourceName = docDbAccountName;
  var options = common.generateCustomHeaders(log, 'Docdb - getDocDbAccount');
  resourceClient.resources.get(resourceGroupName, resourceProviderNamespace, parentResourcePath,
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - getDocDbAccount', true);
    if (err) {
      return callback(err);
    }
    if (response.statusCode == HttpStatus.OK) {
      callback(null, result, resourceGroupName, docDbAccountName);
    } else {
      var e = new Error(JSON.stringify(response.body));
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
}

exports.poll = function(resourceGroupName, docDbAccountName, callback) {
  getDocDbAccount(resourceGroupName, docDbAccountName, function(err, result){
    if (err) {
      callback(err);
    } else {
      callback(null, result.properties.provisioningState);
    }
  });
};

exports.deprovision = function(resourceGroupName, docDbAccountName, callback) {
  var resourceName = docDbAccountName;
  var options = common.generateCustomHeaders(log, 'Docdb - deleteDocDbAccount');
  resourceClient.resources.deleteMethod(resourceGroupName, resourceProviderNamespace, parentResourcePath, 
    resourceType, resourceName, API_VERSIONS.DOCDB, options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Docdb - deleteDocDbAccount', true);
    if (err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.ACCEPTED || response.statusCode == HttpStatus.NO_CONTENT) { // It returns status code 204 if the account is not existed
        callback(null, response.body);
      } else {
        var e = new Error(JSON.stringify(response.body));
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};

function getToken(result, resourceGroupName, docDbAccountName, callback) {
  token.getToken(options.environment, azure_properties, API_VERSIONS.TOKEN, log, function (err, accessToken){
    if (err) {
      callback(err);
    } else {
      callback(null, accessToken, result.properties.documentEndpoint, resourceGroupName, docDbAccountName);
    }
  });
}

function getAccountKey(accessToken, documentEndpoint, resourceGroupName, docDbAccountName, callback){
  request({
    url: util.format('%ssubscriptions/%s/resourcegroups/%s/providers/Microsoft.DocumentDB/databaseAccounts/%s/listKeys',
      options.environment.resourceManagerEndpointUrl, azure_properties.subscriptionId, resourceGroupName, docDbAccountName),
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
      callback(null, documentEndpoint, b.primaryMasterKey);
    } else {
      var e = new Error(JSON.stringify(body));
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
}

exports.bind = function(resourceGroupName, docDbAccountName, callback) {
  
  async.waterfall([
    async.constant(resourceGroupName, docDbAccountName),
    getDocDbAccount,
    getToken,
    getAccountKey
  ], function(err, documentEndpoint, masterKey) {
    if (err) {
      callback(err);
    } else {
      var result = {documentEndpoint: documentEndpoint, masterKey: masterKey};
      callback(null, result);
    }
  });
};

// exports.unbind = function(callback) {
// there is nothing to do for 'unbind' with docDb
// }

