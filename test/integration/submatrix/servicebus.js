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

module.exports = testMatrix;