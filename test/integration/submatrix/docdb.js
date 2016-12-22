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

module.exports = testMatrix;