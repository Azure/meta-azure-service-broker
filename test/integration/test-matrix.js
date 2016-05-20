var uuid = require('node-uuid');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var storageAccountName = 'cf' + instanceId.replace(/-/g, '').slice(0, 22);
var azurestorageblob = {
  serviceName: 'azurestorageblob',
  serviceId: '2e2fc314-37b6-4587-8127-8f9ee8b33fea',
  planId: '6ddf6b41-fb60-4b70-af99-8ecc4896b3cf',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resource_group_name": resourceGroupName,
    "storage_account_name": storageAccountName,
    "location": "eastasia",
    "account_type": "Standard_RAGRS"
  },
  bindingParameters: {},
  credentials: {
    "storage_account_name": storageAccountName,
    "container_name": "<string>",
    "primary_access_key": "<string>",
    "secondary_access_key": "<string>"
  }
}
testMatrix.push(azurestorageblob);

instanceId = uuid.v4();
bindingId = uuid.v4();
var azurestorageblobWithoutParameters = {
  serviceName: 'azurestorageblob',
  serviceId: '2e2fc314-37b6-4587-8127-8f9ee8b33fea',
  planId: '6ddf6b41-fb60-4b70-af99-8ecc4896b3cf',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {},
  bindingParameters: {},
  credentials: {
    "storage_account_name": "<string>",
    "container_name": "<string>",
    "primary_access_key": "<string>",
    "secondary_access_key": "<string>"
  }
}
testMatrix.push(azurestorageblobWithoutParameters);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var namespaceName = 'cf' + instanceId;
var azureservicebus = {
  serviceName: 'azureservicebus',
  serviceId: '6dc44338-2f13-4bc5-9247-5b1b3c5462d3',
  planId: '6be0d8b5-381f-4d68-bdfd-a131425d3835',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resource_group_name": resourceGroupName,
    "namespace_name": namespaceName,
    "location": "eastasia",
    "type": "Messaging",
    "messaging_tier": "Standard"
  },
  bindingParameters: {},
  credentials: {
    "namespace_name": namespaceName,
    "shared_access_key_name": "<string>",
    "shared_access_key_value": "<string>",
  }
}
testMatrix.push(azureservicebus);

instanceId = uuid.v4();
bindingId = uuid.v4();
var azureservicebusWithoutParameters = {
  serviceName: 'azureservicebus',
  serviceId: '6dc44338-2f13-4bc5-9247-5b1b3c5462d3',
  planId: '6be0d8b5-381f-4d68-bdfd-a131425d3835',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {},
  bindingParameters: {},
  credentials: {
    "namespace_name": "<string>",
    "shared_access_key_name": "<string>",
    "shared_access_key_value": "<string>",
  }
}
testMatrix.push(azureservicebusWithoutParameters);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var cacheName = 'cf' + instanceId;
var azurerediscache = {
  serviceName: 'RedisCacheService',
  serviceId: '0346088a-d4b2-4478-aa32-f18e295ec1d9',
  planId: '362b3d1b-5b57-4289-80ad-4a15a760c29c',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resourceGroup": resourceGroupName,
    "cacheName": cacheName,
    "parameters": {
      "location": "eastus",
      "redisVersion": "3.0",
      "enableNonSslPort": false,
      "sku": {
        "name": "Basic",
        "family": "C",
        "capacity": 0
      }
    }
  },
  bindingParameters: {},
  credentials: {
    "hostname": cacheName + ".redis.cache.windows.net",
    "name": cacheName,
    "port": 6379,
    "primaryKey": "<string>",
    "secondaryKey": "<string>",
    "sslPort": 6380
  }
}
testMatrix.push(azurerediscache);

instanceId = uuid.v4();
bindingId = uuid.v4();
var azuredocumentdb = {
  serviceName: 'documentdb',
  serviceId: '3befc561-4f0c-4df3-ab26-48ac4e366b1c',
  planId: '1abb29ae-fa1c-4f8d-a07b-b363544c3586',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resourceGroup": "binxi052001",
    "docDbName": "binxitestdb",
    "parameters": {
      "location": "westus"
    }
  },
  bindingParameters: {},
  credentials: {
    "documentdb_host": "<string>",
    "documentdb_key": "<string>",
    "documentdb_database": "<string>",
    "documentdb_resource_id": "<string>"
  }
}
testMatrix.push(azuredocumentdb);

module.exports = testMatrix;
