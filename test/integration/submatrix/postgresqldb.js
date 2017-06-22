var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];
var postgresqlServerName;
var azurepostgresqldb;

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
postgresqlServerName = 'cf' + instanceId;
azurepostgresqldb = {
  serviceName: 'azure-postgresqldb',
  serviceId: '9569986f-c4d2-47e1-ba65-6763f08c3124',
  planId: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'postgresqlServerName': postgresqlServerName,
    'postgresqlServerParameters': {
      'allowPostgresqlServerFirewallRules': [
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
    'postgresqlServerName': postgresqlServerName,
    'postgresqlServerFullyQualifiedDomainName': '<string>',
    'jdbcUrl': '<string>'
  },
  e2e: true
};
testMatrix.push(azurepostgresqldb);

module.exports = testMatrix;