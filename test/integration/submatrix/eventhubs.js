var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName, namespaceName, azureeventhubs;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
namespaceName = 'cf' + instanceId;
azureeventhubs = {
  serviceName: 'azure-eventhubs',
  serviceId: '7bade660-32f1-4fd7-b9e6-d416d975170b',
  planId: '264ab981-9e37-44ba-b6bb-2d0fe3e80565',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'namespaceName': namespaceName,
    'eventHubName': 'testeh',
    'location': location,
    'tags': {
      'foo': 'bar'
    }
  },
  bindingParameters: {},
  credentials: {
    'namespace_name': namespaceName,
    'event_hub_name': 'testeh',
    'shared_access_key_name': '<string>',
    'shared_access_key_value': '<string>',
  },
  e2e: false
};
// The client only supports AzureCloud
if (environment === 'AzureCloud') {
  azureeventhubs.e2e = true;
}
testMatrix.push(azureeventhubs);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
namespaceName = 'cf' + instanceId;
azureeventhubs = {
  serviceName: 'azure-eventhubs',
  serviceId: '7bade660-32f1-4fd7-b9e6-d416d975170b',
  planId: '264ab981-9e37-44ba-b6bb-2d0fe3e80565',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'namespaceName': namespaceName,
    'eventHubName': 'testeh',
    'location': location,
    'eventHubProperties': {
       'messageRetentionInDays': 1,
       'partitionCount': 2
    },
    'tags': {
      'foo': 'bar'
    }
  },
  bindingParameters: {},
  credentials: {
    'namespace_name': namespaceName,
    'event_hub_name': 'testeh',
    'shared_access_key_name': '<string>',
    'shared_access_key_value': '<string>',
  },
  e2e: false
};
// The client only supports AzureCloud
if (environment === 'AzureCloud') {
  azureeventhubs.e2e = true;
}
testMatrix.push(azureeventhubs);

module.exports = testMatrix;