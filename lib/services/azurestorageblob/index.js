'use strict';

var async = require('async');

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require("azure-arm-resource");
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');

var config = require('./catalog')

// Default Config
var LOCATION = 'eastus'
var RESOURCE_GROUP_NAME_PREFIX = "cloud-foundry-";
var STORAGE_ACCOUNT_NAME_PREFIX = "cf";
var CONTAINER_NAME_PREFIX = "cloud-foundry-";

var Handlers = {};

Handlers.catalog = function(log, params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
}

Handlers.provision = function(log, params, next) {
  log.debug('Provision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var groupParameters = {
    location: LOCATION
  };

  var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
    .replace(/-/g, "").slice(0, 22)
  if (reqParams.hasOwnProperty('storage_account_name') && reqParams.storage_account_name !=
    '') {
    storageAccountName = reqParams.storage_account_name;
  }
  var accountType = 'Standard_LRS';
  if (reqParams.hasOwnProperty('account_type') && reqParams.account_type !=
    '') {
    accountType = reqParams.account_type;
  }
  var accountParameters = {
    location: LOCATION,
    accountType: accountType
  };

  var credentials = new msRestAzure.ApplicationTokenCredentials(params.azure.client_id,
    params.azure.tenant_id, params.azure.client_secret);
  var subscriptionId = params.azure.subscription_id;
  var resourceClient = new resourceManagement.ResourceManagementClient(
    credentials, subscriptionId);
  var storageClient = new storageManagementClient(credentials,
    subscriptionId);

  async.series([
      function(callback) {
        log.info('Creating or updating the resource group ' +
          resourceGroupName);
        resourceClient.resourceGroups.createOrUpdate(resourceGroupName,
          groupParameters,
          function(err, result, request, response) {
            if (err) {
              log.error(err);
              callback(err);
            } else {
              callback(null, {
                resourceGroupName: resourceGroupName,
                groupParameters: groupParameters,
              });
            }
          });
      },
      function(callback) {
        log.info('Creating the storage account ' + storageAccountName);
        storageClient.storageAccounts.beginCreate(resourceGroupName,
          storageAccountName, accountParameters,
          function(err, result, request, response) {
            if (err) {
              log.error(err);
              callback(err);
            } else {
              callback(null, {
                storageAccountName: storageAccountName,
                accountParameters: accountParameters,
              });
            }
          });
      }
    ],
    function(err, results) {
      if (err) {
        log.error(err);
        var error = {
          statusCode: err.statusCode,
          code: err.code,
          description: err.message,
        };
        next(err);
      } else {
        var reply = {
          statusCode: 202,
          code: 'Accepted',
          value: {}
        };
        var result = {
          resourceGroupResult: results[0],
          storageAccountResult: results[1]
        };
        next(null, reply, result);
      }
    });
}

Handlers.poll = function(log, params, next) {
  log.debug('Poll params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  var credentials = new msRestAzure.ApplicationTokenCredentials(params.azure.client_id,
    params.azure.tenant_id, params.azure.client_secret);
  var subscriptionId = params.azure.subscription_id;
  var storageClient = new storageManagementClient(credentials, subscriptionId);
  storageClient.storageAccounts.getProperties(resourceGroupName,
    storageAccountName,
    function(err, result, request, response) {
      var reply = {
        state: '',
        description: '',
      };

      var lastOperation = params.last_operation;
      if (lastOperation == 'provision') {
        if (!err) {
          log.info(
            'Getting the properties of the storage account %s: %j',
            storageAccountName, result);
          var state = result.provisioningState;

          if (state == 'Creating' || state == 'ResolvingDNS') {
            reply.state = 'in progress';
            reply.description =
              'Creating the storage account, state: ' +
              state;
          } else if (state == 'Succeeded') {
            reply.state = 'succeeded';
            reply.description =
              'Creating the storage account, state: ' +
              state;
          }
        } else {
          log.error(err);
          var error = {
            statusCode: err.statusCode,
            code: err.code,
            description: err.message,
          };
          next(err);
        }
      } else if (lastOperation == 'deprovision') {
        if (!err) {
          reply.state = 'in progress';
          reply.description = 'Deleting the storage account'
        } else if (err.statusCode == 404) {
          reply.state = 'succeeded';
          reply.description = 'Deleting the storage account'
        } else {
          log.error(err);
          var error = {
            statusCode: err.statusCode,
            code: err.code,
            description: err.message,
          };
          next(err);
        }
      }
      reply = {
        statusCode: 200,
        code: 'OK',
        value: reply,
      };
      next(null, reply, provisioningResult);
    });
}

Handlers.deprovision = function(log, params, next) {
  log.debug('Deprovision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  var credentials = new msRestAzure.ApplicationTokenCredentials(params.azure.client_id,
    params.azure.tenant_id, params.azure.client_secret);
  var subscriptionId = params.azure.subscription_id;
  var storageClient = new storageManagementClient(credentials, subscriptionId);
  storageClient.storageAccounts.deleteMethod(resourceGroupName,
    storageAccountName,
    function(err, result, request, response) {
      if (!err) {
        var reply = {
          statusCode: 202,
          code: 'Accepted',
          value: {}
        };
        next(null, reply, provisioningResult);
      } else {
        log.error(err);
        var error = {
          statusCode: err.statusCode,
          code: err.code,
          description: err.message,
        };
        next(err);
      }
    });
}

Handlers.bind = function(log, params, next) {
  log.debug('Bind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var containerName = CONTAINER_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('container_name') && reqParams.container_name !=
    '') {
    containerName = reqParams.container_name;
  }

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  var credentials = new msRestAzure.ApplicationTokenCredentials(params.azure.client_id,
    params.azure.tenant_id, params.azure.client_secret);
  var subscriptionId = params.azure.subscription_id;
  var storageClient = new storageManagementClient(credentials, subscriptionId);

  async.waterfall([
      function(callback) {
        storageClient.storageAccounts.listKeys(resourceGroupName,
          storageAccountName,
          function(err, result, response) {
            if (err) {
              log.error(err);
              var error = {
                statusCode: err.statusCode,
                code: err.code,
                description: err.message,
              };
              callback(err);
            } else {
              var primaryAccessKey = result.key1;
              var secondaryAccessKey = result.key2;
              callback(null, primaryAccessKey, secondaryAccessKey);
            }
          });
      },
      function(primaryAccessKey, secondaryAccessKey, callback) {
        var blobService = azureStorage.createBlobService(
          storageAccountName, primaryAccessKey);
        blobService.createContainerIfNotExists(containerName, {
          publicAccessLevel: 'blob'
        }, function(err, result, response) {
          if (err) {
            log.error(err);
            var error = {
              statusCode: err.statusCode,
              code: err.code,
              description: err.message,
            };
            callback(err);
          } else {
            var reply = {
              credentials: {
                storage_account_name: storageAccountName,
                container_name: containerName,
                primary_access_key: primaryAccessKey,
                secondary_access_key: secondaryAccessKey,
              }
            };
            log.info(result);
            callback(null, reply, {});
          }
        });
      }
    ],
    function(err, reply, result) {
      if (err) {
        log.error(err);
        var error = {
          statusCode: err.statusCode,
          code: err.code,
          description: err.message,
        };
        next(err);
      } else {
        var reply = {
          statusCode: 201,
          code: 'Created',
          value: reply,
        };
        next(null, reply, result);
      }
    });
};

Handlers.unbind = function(log, params, next) {
  log.debug('Unbind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  var credentials = new msRestAzure.ApplicationTokenCredentials(params.azure.client_id,
    params.azure.tenant_id, params.azure.client_secret);
  var subscriptionId = params.azure.subscription_id;
  var storageClient = new storageManagementClient(credentials, subscriptionId);

  async.series([
      function(callback) {
        storageClient.storageAccounts.regenerateKey(resourceGroupName,
          storageAccountName, 'key1', {},
          function(err, result, response) {
            if (err) {
              log.error(err);
              callback(err);
            } else {
              callback(null, {});
            }
          });
      },
      function(callback) {
        storageClient.storageAccounts.regenerateKey(resourceGroupName,
          storageAccountName, 'key2', {},
          function(err, result, response) {
            if (err) {
              log.error(err);
              callback(err);
            } else {
              callback(null, {});
            }
          });
      }
    ],
    function(err, results) {
      if (err) {
        log.error(err);
        var error = {
          statusCode: err.statusCode,
          code: err.code,
          description: err.message,
        };
        next(err);
      } else {
        var reply = {
          statusCode: 200,
          code: 'OK',
          value: {},
        };
        var result = {};
        next(null, reply, result);
      }
    });
};

module.exports = Handlers;