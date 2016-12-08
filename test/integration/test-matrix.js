var uuid = require('node-uuid');
var util = require('util');
var _ = require('underscore');
var supportedEnvironments = require('../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];
if (!_.has(supportedEnvironments, environment)) {
  throw new Error(util.format('The test does not support %s', environment));
}

var location = supportedEnvironments[environment]['location'];

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var storageAccountName = 'cf' + instanceId.replace(/-/g, '').slice(0, 22);
var azurestorage = {
  serviceName: 'azure-storage',
  serviceId: '2e2fc314-37b6-4587-8127-8f9ee8b33fea',
  planId: '6ddf6b41-fb60-4b70-af99-8ecc4896b3cf',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resource_group_name": resourceGroupName,
    "storage_account_name": storageAccountName,
    "location": location,
    "account_type": "Standard_RAGRS",
    "tags": {
      "foo": "bar"
    }
  },
  bindingParameters: {},
  credentials: {
    "storage_account_name": storageAccountName,
    "primary_access_key": "<string>",
    "secondary_access_key": "<string>"
  }
}
testMatrix.push(azurestorage);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var namespaceName = 'cf' + instanceId;
var azureservicebus = {
  serviceName: 'azure-servicebus',
  serviceId: '6dc44338-2f13-4bc5-9247-5b1b3c5462d3',
  planId: '6be0d8b5-381f-4d68-bdfd-a131425d3835',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resource_group_name": resourceGroupName,
    "namespace_name": namespaceName,
    "location": location,
    "type": "Messaging",
    "messaging_tier": "Standard",
    "tags": {
      "foo": "bar"
    }
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
resourceGroupName = 'cloud-foundry-' + instanceId;
var azuredocumentdb = {
  serviceName: 'azure-documentdb',
  serviceId: '3befc561-4f0c-4df3-ab26-48ac4e366b1c',
  planId: '1abb29ae-fa1c-4f8d-a07b-b363544c3586',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resourceGroup": resourceGroupName,
    "docDbAccountName": instanceId,
    "docDbName": instanceId,
    "location": location
  },
  bindingParameters: {},
  credentials: {
    "documentdb_host_endpoint": "<string>",
    "documentdb_master_key": "<string>",
    "documentdb_database_id": instanceId,
    "documentdb_database_link": "<string>"
  }
}
testMatrix.push(azuredocumentdb);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var sqlServerName = 'cf' + instanceId;
var sqldbName = 'cf' + instanceId;
var azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resourceGroup": resourceGroupName,
    "location": location,
    "sqlServerName": sqlServerName,
    "sqlServerCreateIfNotExist": true,
    "sqlServerParameters": {
      "allowSqlServerFirewallRules": [
        {
          "ruleName": "test",
          "startIpAddress": "0.0.0.0",
          "endIpAddress": "0.0.0.255"
        },
        {
          "ruleName": "all",
          "startIpAddress": "0.0.0.0",
          "endIpAddress": "255.255.255.255"
        }
      ],
      "location": location,
      "properties": {
        "administratorLogin": "azureuser",
        "administratorLoginPassword": "c1oudc0w!@#"
      },
      "tags": {
        "foo": "bar"
      }
    },
    "sqldbName": sqldbName,
    "sqldbParameters": {
      "location": location,
      "properties": {
        "collation": "SQL_Latin1_General_CP1_CI_AS"
      },
      "tags": {
        "foo": "bar"
      }
    }
  },
  bindingParameters: {},
  credentials: {
    "administratorLogin": "<string>",
    "administratorLoginPassword": "<string>",
    "sqlServerName": sqlServerName,
    "sqldbName": sqldbName,
    "jdbcUrl": "<string>"
  }
}
testMatrix.push(azuresqldb);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var cacheName = 'cf' + instanceId;
var hostname = cacheName + supportedEnvironments[environment]['redisCacheEndpointSuffix'];
var azurerediscache = {
  serviceName: 'azure-rediscache',
  serviceId: '0346088a-d4b2-4478-aa32-f18e295ec1d9',
  planId: '362b3d1b-5b57-4289-80ad-4a15a760c29c',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    "resourceGroup": resourceGroupName,
    "cacheName": cacheName,
    "parameters": {
      "location": location,
      "enableNonSslPort": false,
      "sku": {
        "name": "Basic",
        "family": "C",
        "capacity": 0
      },
      "tags": {
        "foo": "bar"
      }
    }
  },
  bindingParameters: {},
  credentials: {
    "hostname": hostname,
    "name": cacheName,
    "port": 6379,
    "primaryKey": "<string>",
    "secondaryKey": "<string>",
    "sslPort": 6380
  }
}
testMatrix.push(azurerediscache);

module.exports = testMatrix;

