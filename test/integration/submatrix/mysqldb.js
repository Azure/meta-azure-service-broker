var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];
var mysqlServerName;
var azuremysqldb;

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
mysqlServerName = 'cf' + instanceId;
azuremysqldb = {
  serviceName: 'azure-mysqldb',
  serviceId: 'e40b3635-01bc-4262-b2c5-0847bd7ab43b',
  planId: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'mysqlServerName': mysqlServerName,
    'mysqlServerParameters': {
      'allowMysqlServerFirewallRules': [
        {
          'ruleName': 'test',
          'startIpAddress': '0.0.0.0',
          'endIpAddress': '255.255.255.255'
        }
      ],
      'properties': {
        'sslEnforcement': 'Disabled',
        'administratorLogin': 'azureuser',
        'administratorLoginPassword': 'c1oudc0w!@#'
      },
      'tags': {
        'foo': 'bar'
      }
    }
  },
  bindingParameters: {},
  credentials: {
    'administratorLogin': '<string>',
    'administratorLoginPassword': '<string>',
    'mysqlServerName': mysqlServerName,
    'mysqlServerFullyQualifiedDomainName': '<string>',
    'jdbcUrl': '<string>'
  },
  e2e: true
};
testMatrix.push(azuremysqldb);

module.exports = testMatrix;