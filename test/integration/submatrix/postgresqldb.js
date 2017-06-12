const uuid = require('uuid');
const util = require('util');
const _ = require('underscore');

const supportedEnvironments = require('../../utils/supportedEnvironments');

let testMatrix = [];

var environment = process.env['ENVIRONMENT'];
if (!_.has(supportedEnvironments, environment)) {
  throw new Error(util.format('The test does not support %s', environment));
}

var location = supportedEnvironments[environment]['location'];

let instanceId = uuid.v4();
let bindingId = uuid.v4();
let resourceGroup = 'cloud-foundry-' + instanceId;
let postgresqlServerName = 'cf' + instanceId;
let postgresqldbName = 'my_db';
let postgresqldb = {
  serviceName: 'azure-postgresqldb',
  serviceId: '9569986f-c4d2-47e1-ba65-6763f08c3124',
  planId: 'bb6ddfd0-4d8f-4496-aa33-d64ad9562c1f',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    resourceGroup: resourceGroup,
    location: location,
    postgresqlServerName: postgresqlServerName,
    postgresqlServerParameters: {
      allowPostgresqlServerFirewallRules: [
        {
          ruleName: 'AllowAllIps',
          startIpAddress: '0.0.0.0',
          endIpAddress: '255.255.255.255'
        }
      ],
      properties: {
        // sslEnforcement: 'Disabled',
        administratorLogin: 'azureuser',
        administratorLoginPassword: 'c1oudc0w!@#'
      },
      tags: {
        foo: 'bar'
      }
    },
    postgresqldbName: postgresqldbName
  },
  bindingParameters: {},
  credentials: {
    databaseLogin: '<string>',
    databaseLoginPassword: '<string>',
    postgresqlServerName: postgresqlServerName,
    postgresqlServerFullyQualifiedDomainName: '<string>',
    postgresqldbName: postgresqldbName,
    jdbcUrl: '<string>'
  },
  e2e: true
};
testMatrix.push(postgresqldb);

module.exports = testMatrix;
