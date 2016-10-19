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
        var options = common.generateCustomHeaders(log, 'Storage - checkNameAvailability');
        storageClient.storageAccounts.checkNameAvailability(storageAccountName, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Storage - checkNameAvailability', true);
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
        var options = common.generateCustomHeaders(log, 'Storage - createOrUpdateResourceGroup');
        resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Storage - createOrUpdateResourceGroup', true);
            callback(err, {
              resourceGroupName: resourceGroupName,
              groupParameters: groupParameters,
            });
          });
      },
      function(callback) {
        var options = common.generateCustomHeaders(log, 'Storage - createStorageAccount');
        storageClient.storageAccounts.beginCreate(resourceGroupName, storageAccountName, accountParameters, options,
          function(err, result, request, response) {
            common.logHttpResponse(log, response, 'Storage - createStorageAccount', true);
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
  var options = common.generateCustomHeaders(log, 'Storage - getProperties');
  storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Storage - getProperties', true);
      if (err) {
        next(err);
      } else {
        next(null, result.provisioningState);
      }
    });
};

exports.deprovision = function(resourceGroupName, storageAccountName, next) {
  var options = common.generateCustomHeaders(log, 'Storage - deleteMethod');
  storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Storage - deleteMethod', true);
      next(err);
    }
  );
};

exports.bind = function(resourceGroupName, storageAccountName, next) {
  var options = common.generateCustomHeaders(log, 'Storage - listKeys');
  storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName, options,
    function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Storage - listKeys', false);
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

