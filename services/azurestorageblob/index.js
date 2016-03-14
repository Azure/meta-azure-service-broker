'use strict';

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require("azure-arm-resource");
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');
var Config = require('./catalog')

//Environment Setup
var subscriptionId = process.env['subscription_id'];
var tenantId = process.env['tenant_id'];
var clientId = process.env['client_id'];
var clientSecret = process.env['client_secret'];
var credentials = new msRestAzure.ApplicationTokenCredentials(clientId,
  tenantId, clientSecret);
var resourceClient = new resourceManagement.ResourceManagementClient(
  credentials, subscriptionId);
var storageClient = new storageManagementClient(credentials, subscriptionId);

//Sample Config
var location = 'eastus'
var RESOURCE_GROUP_NAME_PREFIX = "cloud-foundry-";
var STORAGE_ACCOUNT_NAME_PREFIX = "cf";
var CONTAINER_NAME_PREFIX = "cloud-foundry-";

var Handlers = {};

Handlers.catalog = function(broker, req, next) {
  var reply = Config;
  return reply;
}

Handlers.provision = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.id;
    var params = req.params.parameters;
    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    if (params.hasOwnProperty('resource_group_name') && params.resource_group_name !=
      '') {
      resourceGroupName = params.resource_group_name;
    }
    var groupParameters = {
      location: location
    };
    broker.log.info('Creating or updating the resource group ' +
      resourceGroupName);
    resourceClient.resourceGroups.createOrUpdate(resourceGroupName,
      groupParameters,
      function(err, result, request, response) {
        if (err) {
          broker.log.info(err);
        } else {
          var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
            .replace(/-/g, "").slice(0, 22)
          if (params.hasOwnProperty('storage_account_name') && params.storage_account_name !=
            '') {
            storageAccountName = params.storage_account_name;
          }
          var accountType = 'Standard_LRS';
          if (params.hasOwnProperty('account_type') && params.account_type !=
            '') {
            accountType = params.account_type;
          }
          var accountParameters = {
            location: location,
            accountType: accountType
          };
          storageClient.storageAccounts.create(resourceGroupName,
            storageAccountName, accountParameters,
            function(err, result, request, response) {
              if (!err) {
                broker.log.info('Creating the storage account ' +
                  storageAccountName);
              } else {
                broker.log.error('Failed to create the storage account ' +
                  storageAccountName);
              }
            });
        }
      });
    var reply = {};
    next(reply);
  }
}

Handlers.poll = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.id;
    var params = req.params.parameters;
    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    if (params.hasOwnProperty('resource_group_name') && params.resource_group_name !=
      '') {
      resourceGroupName = params.resource_group_name;
    }
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22)
    if (params.hasOwnProperty('storage_account_name') && params.storage_account_name !=
      '') {
      storageAccountName = params.storage_account_name;
    }

    storageClient.storageAccounts.getProperties(resourceGroupName,
      storageAccountName,
      function(err, result, request, response) {

        broker.db.getServiceInstance(instanceId, function(errIgnore,
          serviceInstance) {
          var reply = {
            state: '',
            description: '',
          };
          var lastOperation = serviceInstance.last_operation.operation;
          if (lastOperation == 'provision') {
            if (!err) {
              broker.log.info(
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
              broker.log.error(err);
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
              broker.log.error(err);
              reply.state = 'failed';
              reply.description = err;
            }
          }
          next(reply);
        });
      });
  }
}

Handlers.deprovision = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.id;
    var params = req.params.parameters;
    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    if (params.hasOwnProperty('resource_group_name') && params.resource_group_name !=
      '') {
      resourceGroupName = params.resource_group_name;
    }
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22)
    if (params.hasOwnProperty('storage_account_name') && params.storage_account_name !=
      '') {
      storageAccountName = params.storage_account_name;
    }
    storageClient.storageAccounts.deleteMethod(resourceGroupName,
      storageAccountName,
      function(err, result, request, response) {
        if (!err) {}
      });
    var reply = {};
    next(reply);
  }
}

Handlers.bind = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.instance_id;
    var params = req.params.parameters

    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    if (params.hasOwnProperty('resource_group_name') && params.resource_group_name !=
      '') {
      resourceGroupName = params.resource_group_name;
    }
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22);
    if (params.hasOwnProperty('storage_account_name') && params.storage_account_name !=
      '') {
      storageAccountName = params.storage_account_name;
    }
    storageClient.storageAccounts.listKeys(resourceGroupName,
      storageAccountName, {},
      function(error, result, response) {
        if (error) {
          broker.log.info(error);
        } else {
          var primaryAccessKey = result.key1;
          var secondaryAccessKey = result.key2;
          var blobService = azureStorage.createBlobService(
            storageAccountName, primaryAccessKey);

          var containerName = CONTAINER_NAME_PREFIX + instanceId;
          if (params.hasOwnProperty('container_name') && params.container_name !=
            '') {
            containerName = params.container_name;
          }
          blobService.createContainerIfNotExists(containerName, {
            publicAccessLevel: 'blob'
          }, function(error, result, response) {
            if (!error) {
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
  }
};

Handlers.unbind = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.instance_id;
    var params = req.params.parameters

    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    if (params.hasOwnProperty('resource_group_name') && params.resource_group_name !=
      '') {
      resourceGroupName = params.resource_group_name;
    }
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22);
    if (params.hasOwnProperty('storage_account_name') && params.storage_account_name !=
      '') {
      storageAccountName = params.storage_account_name;
    }
    storageClient.storageAccounts.regenerateKey(resourceGroupName,
      storageAccountName, 'key1', {},
      function(error, result, response) {
        if (error) {
          broker.log.info(error);
        } else {
          storageClient.storageAccounts.regenerateKey(resourceGroupName,
            storageAccountName, 'key2', {},
            function(error, result, response) {
              if (error) {
                broker.log.info(error);
              } else {
                next();
              }
            });
        }
      });
  }
};

module.exports = Handlers;