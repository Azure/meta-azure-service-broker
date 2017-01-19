var uuid = require('node-uuid');
var util = require('util');
var _ = require('underscore');

var supportedEnvironments = require('../../utils/supportedEnvironments');

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