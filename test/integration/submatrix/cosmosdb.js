var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName, cosmosDbAccountName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
// The limit of the length of the CosmosDB/DocumentDB account name is [50 characters – length of region name – 1 (length of ‘-‘)]
// For the regions the test specify, 31 chars is suitable
cosmosDbAccountName = instanceId.slice(0, 31);

var azurecosmosdb = {
  serviceName: 'azure-cosmosdb',
  serviceId: '405db572-c611-4496-abc3-382fe70f29d7',
  planId: '19d433f0-ea86-4e81-84d1-92eb97e8a434',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'cosmosDbAccountName': cosmosDbAccountName,
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
cosmosDbAccountName = instanceId;
if (environment === 'AzureGermanCloud') { // The max length of account name is 31 on AzureGermanCloud
  cosmosDbAccountName = cosmosDbAccountName.slice(0, 31);
}
azurecosmosdb = {
  serviceName: 'azure-cosmosdb',
  serviceId: '405db572-c611-4496-abc3-382fe70f29d7',
  planId: '19d433f0-ea86-4e81-84d1-92eb97e8a434',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'cosmosDbAccountName': cosmosDbAccountName,
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