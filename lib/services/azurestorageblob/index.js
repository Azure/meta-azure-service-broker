'use strict';

var resourceManagement = require("azure-arm-resource");
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');

var config = require('./catalog')

//Sample Config
var location = 'eastus'
var RESOURCE_GROUP_NAME_PREFIX = "cloud-foundry-";
var STORAGE_ACCOUNT_NAME_PREFIX = "cf";
var CONTAINER_NAME_PREFIX = "cloud-foundry-";

var Handlers = {};

Handlers.catalog = function(credentials, subscriptionId, params, log, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
}

Handlers.provision = function(credentials, subscriptionId, params, log, next) {
  log.debug('Provision params: %j', params);


  var instanceId = params.id;
  var reqParams = params.parameters || {};
  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var groupParameters = {
    location: location
  };

  log.info('Creating or updating the resource group ' +
    resourceGroupName);
  var resourceClient = new resourceManagement.ResourceManagementClient(
    credentials, subscriptionId);
  resourceClient.resourceGroups.createOrUpdate(resourceGroupName,
    groupParameters,
    function(err, result, request, response) {
      if (err) {
        log.err(err);
      } else {
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
          location: location,
          accountType: accountType
        };

        var storageClient = new storageManagementClient(credentials,
          subscriptionId);
        storageClient.storageAccounts.create(resourceGroupName,
          storageAccountName, accountParameters,
          function(err, result, request, response) {
            if (!err) {
              log.info('Creating the storage account ' +
                storageAccountName);
            } else {
              log.error('Failed to create the storage account ' +
                storageAccountName);
            }
          });
      }
    });
  var reply = {};
  next(reply);
}

Handlers.poll = function(credentials, subscriptionId, params, log, next) {
  log.debug('Poll params: %j', params);

  var instanceId = params.id;
  var reqParams = params.parameters || {};
  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
    .replace(/-/g, "").slice(0, 22)
  if (reqParams.hasOwnProperty('storage_account_name') && reqParams.storage_account_name !=
    '') {
    storageAccountName = reqParams.storage_account_name;
  }

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
          reply.state = 'failed';
          reply.description = err;
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
          reply.state = 'failed';
          reply.description = err;
        }
      }
      next(reply);
    });
}

Handlers.deprovision = function(credentials, subscriptionId, params, log, next) {
  log.debug('Deprovision params: %j', params);

  var instanceId = params.id;
  var reqParams = params.parameters || {};
  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
    .replace(/-/g, "").slice(0, 22)
  if (reqParams.hasOwnProperty('storage_account_name') && reqParams.storage_account_name !=
    '') {
    storageAccountName = reqParams.storage_account_name;
  }

  var storageClient = new storageManagementClient(credentials, subscriptionId);
  storageClient.storageAccounts.deleteMethod(resourceGroupName,
    storageAccountName,
    function(err, result, request, response) {
      if (!err) {} else {
        log.error(err);
      }
    });
  var reply = {};
  next(reply);
}

Handlers.bind = function(credentials, subscriptionId, params, log, next) {
  log.debug('Bind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
    .replace(/-/g, "").slice(0, 22);
  if (reqParams.hasOwnProperty('storage_account_name') && reqParams.storage_account_name !=
    '') {
    storageAccountName = reqParams.storage_account_name;
  }

  var storageClient = new storageManagementClient(credentials, subscriptionId);
  storageClient.storageAccounts.listKeys(resourceGroupName,
    storageAccountName, {},
    function(err, result, response) {
      if (err) {
        log.err(err);
      } else {
        var primaryAccessKey = result.key1;
        var secondaryAccessKey = result.key2;
        var blobService = azureStorage.createBlobService(
          storageAccountName, primaryAccessKey);

        var containerName = CONTAINER_NAME_PREFIX + instanceId;
        if (reqParams.hasOwnProperty('container_name') && reqParams.container_name !=
          '') {
          containerName = reqParams.container_name;
        }
        blobService.createContainerIfNotExists(containerName, {
          publicAccessLevel: 'blob'
        }, function(err, result, response) {
          if (!err) {
            var reply = {
              credentials: {
                storage_account_name: storageAccountName,
                container_name: containerName,
                primary_access_key: primaryAccessKey,
                secondary_access_key: secondaryAccessKey,
              }
            };
            next(reply);
          }
        });
      }
    });
};

Handlers.unbind = function(credentials, subscriptionId, params, log, next) {
  log.debug('Unbind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
  if (reqParams.hasOwnProperty('resource_group_name') && reqParams.resource_group_name !=
    '') {
    resourceGroupName = reqParams.resource_group_name;
  }
  var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
    .replace(/-/g, "").slice(0, 22);
  if (reqParams.hasOwnProperty('storage_account_name') && reqParams.storage_account_name !=
    '') {
    storageAccountName = reqParams.storage_account_name;
  }

  var storageClient = new storageManagementClient(credentials, subscriptionId);
  storageClient.storageAccounts.regenerateKey(resourceGroupName,
    storageAccountName, 'key1', {},
    function(err, result, response) {
      if (err) {
        log.err(err);
      } else {
        storageClient.storageAccounts.regenerateKey(resourceGroupName,
          storageAccountName, 'key2', {},
          function(err, result, response) {
            if (err) {
              log.err(err);
            } else {}
          });
      }
    });
  next();
};

module.exports = Handlers;