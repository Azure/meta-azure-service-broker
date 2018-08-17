var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
var cacheName = 'cf' + instanceId;
var azurerediscache = {
  serviceName: 'azure-rediscache',
  serviceId: '0346088a-d4b2-4478-aa32-f18e295ec1d9',
  planId: '060fb892-dcb1-4a1a-a292-b67516dcdcad',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'cacheName': cacheName,
    'parameters': {
      'enableNonSslPort': false
    }
  },
  bindingParameters: {},
  credentials: {
    'hostname': '<string>',
    'name': cacheName,
    'port': 6379,
    'primaryKey': '<string>',
    'secondaryKey': '<string>',
    'sslPort': 6380,
    'redisUrl': '<string>'
  },
  updatingParameters: {
    'parameters': {
      'enableNonSslPort': true
    }
  },
  updatePlanId: '170fb362-990d-4373-8f47-5d43c593b978'
};
testMatrix.push(azurerediscache);

module.exports = testMatrix;
