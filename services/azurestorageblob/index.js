'use strict';

var msRestAzure = require('ms-rest-azure');
var resourceManagement = require("azure-arm-resource");
var storageManagementClient = require('azure-arm-storage');
var azureStorage = require('azure-storage');
var Config = require('./catalog')

//Environment Setup
var subscriptionID = process.env['subscriptionID'];
var tenantID = process.env['tenantID'];
var clientID = process.env['clientID'];
var clientSecret = process.env['clientSecret'];
var credentials = new msRestAzure.ApplicationTokenCredentials(clientID,
  tenantID, clientSecret);
var resourceClient = new resourceManagement.ResourceManagementClient(
  credentials, subscriptionID);
var storageClient = new storageManagementClient(credentials, subscriptionID);

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
              if (!err) {}
            });
        }
      });
    var reply = {
      dashboard_url: instanceId
    };
    next(reply);
  }
}

Handlers.poll = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.id;
    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22)
    storageClient.storageAccounts.getProperties(resourceGroupName,
      storageAccountName,
      function(err, result, request, response) {
        var reply = {
          state: '',
          description: '',
        };
        if (!err) {
          var state = result.provisioningState;

          if (state == 'Creating' || state == 'ResolvingDNS') {
            reply.state = 'in progress';
            reply.description = state;
          } else {
            reply.state = 'succeeded';
            reply.description = state;
          }
        } else {
          broker.log.info(err);
          reply.state = 'failed';
          reply.description = err;
        }
        next(reply);
      });
  }
}

Handlers.deprovision = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var instanceId = req.params.id;
    var resourceGroupName = RESOURCE_GROUP_NAME_PREFIX + instanceId;
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22)
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
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22);
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
                  StorageAccountName: storageAccountName,
                  ContainerName: containerName,
                  PrimaryAccessKey: primaryAccessKey,
                  SecondaryAccessKey: secondaryAccessKey,
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
    var storageAccountName = STORAGE_ACCOUNT_NAME_PREFIX + instanceId
      .replace(/-/g, "").slice(0, 22);
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
