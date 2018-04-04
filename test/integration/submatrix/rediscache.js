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
  planId: '362b3d1b-5b57-4289-80ad-4a15a760c29c',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'cacheName': cacheName,
    'parameters': {
      'enableNonSslPort': true,
      'tags': {
        'foo': 'bar'
      }
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
  }
};
testMatrix.push(azurerediscache);

module.exports = testMatrix;