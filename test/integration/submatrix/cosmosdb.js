var uuid = require('uuid');
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
var azurecosmosdb = {
  serviceName: 'azure-cosmosdb',
  serviceId: '405db572-c611-4496-abc3-382fe70f29d7',
  planId: '19d433f0-ea86-4e81-84d1-92eb97e8a434',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'cosmosDbAccountName': instanceId,
    'cosmosDbName': instanceId,
    'location': location
  },
  bindingParameters: {},
  credentials: {
    'cosmosdb_host_endpoint': '<string>',
    'cosmosdb_master_key': '<string>',
    'cosmosdb_readonly_master_key': '<string>',
    'cosmosdb_database_id': instanceId,
    'cosmosdb_database_link': '<string>'
  }
};
testMatrix.push(azurecosmosdb);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
azurecosmosdb = {
  serviceName: 'azure-cosmosdb',
  serviceId: '405db572-c611-4496-abc3-382fe70f29d7',
  planId: '19d433f0-ea86-4e81-84d1-92eb97e8a434',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'cosmosDbAccountName': instanceId,
    'cosmosDbName': instanceId,
    'location': location,
    'kind': 'MongoDB',
  },
  bindingParameters: {},
  credentials: {
    'cosmosdb_host_endpoint': '<string>',
    'cosmosdb_username': '<string>',
    'cosmosdb_password': '<string>',
    'cosmosdb_readonly_password': '<string>',
    'cosmosdb_connection_string': '<string>',
    'cosmosdb_readonly_connection_string': '<string>',
  }
};
testMatrix.push(azurecosmosdb);

module.exports = testMatrix;