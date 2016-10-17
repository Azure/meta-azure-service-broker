/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require('azure-arm-resource');
var storageManagementClient = require('azure-arm-storage');
var common = require('../../common');
var HttpStatus = require('http-status-codes');

var resourceClient;
var storageClient;
var options = {};
var log;

exports.init = function(azure, logger) {
  log = logger;
  
  options.environment = common.getEnvironment(azure.environment);

  var credentials = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);
  var subscriptionId = azure.subscriptionId;

  resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
  storageClient = new storageManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
};

exports.provision = function(resourceGroupName, groupParameters, storageAccountName, accountParameters, next) {
  async.series([
      function(callback) {
        var options = common.generateCustomHeaders(log, 'StorageBlob - checkNameAvailability');
        storageClient.storageAccounts.checkNameAvailability(storageAccountName, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'StorageBlob - checkNameAvailability', true);
            if (err) {
              callback(err);
            } else {
              if (result.nameAvailable) {
                callback(null);
              } else {
                var error = new Error(result.message);
                if (result.reason === 'AccountNameInvalid') {
                  error.statusCode = HttpStatus.BAD_REQUEST;
                } else {
                  error.statusCode = HttpStatus.CONFLICT;
                }
                callback(error);
              }
            }
          });
      },
      function(callback) {
        var options = common.generateCustomHeaders(log, 'StorageBlob - createOrUpdateResourceGroup');
        resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'StorageBlob - createOrUpdateResourceGroup', true);
            callback(err, {
              resourceGroupName: resourceGroupName,
              groupParameters: groupParameters,
            });
          });
      },
      function(callback) {
        var options = common.generateCustomHeaders(log, 'StorageBlob - createStorageAccount');
        storageClient.storageAccounts.beginCreate(resourceGroupName, storageAccountName, accountParameters, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'StorageBlob - createStorageAccount', true);
            callback(err, {
              storageAccountName: storageAccountName,
              accountParameters: accountParameters,
            });
          });
      }
    ],
    function(err, results) {
      var result = {
        resourceGroupResult: results[1],
        storageAccountResult: results[2]
      };
      next(err, result);
    });
};

exports.poll = function(resourceGroupName, storageAccountName, next) {
  var options = common.generateCustomHeaders(log, 'StorageBlob - getProperties');
  storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'StorageBlob - getProperties', true);
      if (err) {
        next(err);
      } else {
        next(null, result.provisioningState);
      }
    });
};

exports.deprovision = function(resourceGroupName, storageAccountName, next) {
  var options = common.generateCustomHeaders(log, 'StorageBlob - deleteMethod');
  storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'StorageBlob - deleteMethod', true);
      next(err);
    }
  );
};

exports.bind = function(resourceGroupName, storageAccountName, next) {
  var options = common.generateCustomHeaders(log, 'StorageBlob - listKeys');
  storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'StorageBlob - listKeys', false);
      if (err) {
        next(err);
      } else {
        var primaryAccessKey = result.key1;
        var secondaryAccessKey = result.key2;
        next(null, primaryAccessKey, secondaryAccessKey);
      }
    }
  );
};

exports.unbind = function(resourceGroupName, storageAccountName, next) {
  async.series([
      function(callback) {
        var options = common.generateCustomHeaders(log, 'Regenerate storage account key1');
        storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key1', options,
          function(err, result, response) {
            common.logHttpResponse(log, response, 'Regenerate storage account key1', false);
            callback(err);
          });
      },
      function(callback) {
        var options = common.generateCustomHeaders(log, 'Regenerate storage account key2');
        storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key2', options,
          function(err, result, response) {
            common.logHttpResponse(log, response, 'Regenerate storage account key2', false);
            callback(err);
          });
      }
    ],
    function(err) {
      next(err);
    });
};

