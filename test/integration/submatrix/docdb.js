var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName, docDbAccountName;

var environment = process.env['ENVIRONMENT'];

var location;
// List of available regions for the 'Microsoft.DocumentDB/databaseAccounts' is 'usgovarizona,usgovtexas'.
if (environment === 'AzureUSGovernment') {
  location = 'usgovtexas';
} else {
  location = supportedEnvironments[environment]['location'];
}

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
// The limit of the length of the CosmosDB/DocumentDB account name is [50 characters – length of region name – 1 (length of ‘-‘)]
// For the regions the test specify, 31 chars is suitable
docDbAccountName = instanceId.slice(0, 31);

var azuredocumentdb = {
  serviceName: 'azure-documentdb',
  serviceId: '3befc561-4f0c-4df3-ab26-48ac4e366b1c',
  planId: '1abb29ae-fa1c-4f8d-a07b-b363544c3586',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'docDbAccountName': docDbAccountName,
    'docDbName': instanceId,
    'location': location
  },
  bindingParameters: {},
  credentials: {
    'documentdb_host_endpoint': '<string>',
    'documentdb_master_key': '<string>',
    'documentdb_database_id': instanceId,
    'documentdb_database_link': '<string>'
  }
};
testMatrix.push(azuredocumentdb);

module.exports = testMatrix;