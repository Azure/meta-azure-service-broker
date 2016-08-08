/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require('azure-arm-resource');
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');
var common = require('../../common');

var resourceClient;
var storageClient;
var options = {};

exports.init = function(azure) {

  options.environment = common.getEnvironment(azure.environment);

  var credentials = new msRestAzure.ApplicationTokenCredentials(azure.client_id, azure.tenant_id, azure.client_secret, options);
  var subscriptionId = azure.subscription_id;

  resourceClient = new resourceManagement.ResourceManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
  storageClient = new storageManagementClient(credentials, subscriptionId, options.environment.resourceManagerEndpointUrl);
};

exports.provision = function(resourceGroupName, groupParameters, storageAccountName, accountParameters, next) {
  async.series([
      function(callback) {
        resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters,
          function(err, result, request, response) {
            callback(err, {
              resourceGroupName: resourceGroupName,
              groupParameters: groupParameters,
            });
          });
      },
      function(callback) {
        storageClient.storageAccounts.beginCreate(resourceGroupName, storageAccountName, accountParameters,
          function(err, result, request, response) {
            callback(err, {
              storageAccountName: storageAccountName,
              accountParameters: accountParameters,
            });
          });
      }
    ],
    function(err, results) {
      next(err, results);
    });
};

exports.poll = function(resourceGroupName, storageAccountName, next) {
  storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName,
    function(err, result, request, response) {
      if (err) {
        next(err);
      } else {
        next(err, result.provisioningState);
      }
    });
};

exports.deprovision = function(resourceGroupName, storageAccountName, next) {
  storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName,
    function(err, result, request, response) {
      next(err);
    });
};

exports.bind = function(resourceGroupName, storageAccountName, containerName, next) {
  async.waterfall([
      function(callback) {
        storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName,
          function(err, result, response) {
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
            callback(err);
          });
      },
      function(callback) {
        storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, 'key2', {},
          function(err, result, response) {
            callback(err);
          });
      }
    ],
    function(err) {
      next(err);
    });
};
