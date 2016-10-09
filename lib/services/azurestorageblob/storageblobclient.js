/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require('azure-arm-resource');
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');
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
        storageClient.storageAccounts.checkNameAvailability(storageAccountName,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Check storage account name availability', true);
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
        resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Create or update resource group', true);
            callback(err, {
              resourceGroupName: resourceGroupName,
              groupParameters: groupParameters,
            });
          });
      },
      function(callback) {
        storageClient.storageAccounts.beginCreate(resourceGroupName, storageAccountName, accountParameters,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Create storage account', true);
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
  storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Get storage account properties', true);
      if (err) {
        next(err);
      } else {
        next(null, result.provisioningState);
      }
    });
};

exports.deprovision = function(resourceGroupName, storageAccountName, next) {
  storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Delete storage account', true);
      next(err);
    });
};

exports.bind = function(resourceGroupName, storageAccountName, containerName, next) {
  async.waterfall([
      function(callback) {
        storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName,
          function(err, result, response) {
            common.logHttpResponse(log, response, 'List storage keys', false);
            if (err) {
              callback(err);
            } else {
              var primaryAccessKey = result.key1;
              var secondaryAccessKey = result.key2;
              callback(null, primaryAccessKey, secondaryAccessKey);
            }
          });
      },
      function(primaryAccessKey, secondaryAccessKey, callback) {
        var host = storageAccountName + '.blob' + options.environment.storageEndpointSuffix;
        var blobService = azureStorage.createBlobService(storageAccountName, primaryAccessKey, host);
        blobService.createContainerIfNotExists(containerName, {
            publicAccessLevel: 'blob'
          },
          function(err, result, response) {
            common.logHttpResponse(log, response, 'Create storage container', true);
            if (err) {
              callback(err);
            } else {
              callback(null, primaryAccessKey, secondaryAccessKey);
            }
          });
      }
    ],
    function(err, primaryAccessKey, secondaryAccessKey) {
      next(err, primaryAccessKey, secondaryAccessKey);
    });
};

exports.unbind = function(resourceGroupName, storageAccountName, next) {
  async.series([
      function(callback) {
        storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key1', {},
          function(err, result, response) {
            common.logHttpResponse(log, response, 'Regenerate storage account key1', false);
            callback(err);
          });
      },
      function(callback) {
        storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key2', {},
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
