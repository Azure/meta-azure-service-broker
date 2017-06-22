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
var storageAccountName = 'cf' + instanceId.replace(/-/g, '').slice(0, 22);
var azurestorage = {
  serviceName: 'azure-storage',
  serviceId: '2e2fc314-37b6-4587-8127-8f9ee8b33fea',
  planId: '6ddf6b41-fb60-4b70-af99-8ecc4896b3cf',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'storageAccountName': storageAccountName,
    'location': location,
    'accountType': 'Standard_RAGRS',
    'tags': {
      'foo': 'bar'
    }
  },
  bindingParameters: {},
  credentials: {
    'storage_account_name': storageAccountName,
    'primary_access_key': '<string>',
    'secondary_access_key': '<string>'
  }
};
testMatrix.push(azurestorage);

module.exports = testMatrix;