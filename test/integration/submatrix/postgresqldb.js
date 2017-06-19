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
let postgresqldb = {
  serviceName: 'azure-postgresqldb',
  serviceId: '9569986f-c4d2-47e1-ba65-6763f08c3124',
  planId: 'bb6ddfd0-4d8f-4496-aa33-d64ad9562c1f',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    resourceGroup: resourceGroup,
    location: location,
    // // The postgresqlServerName is deliberately withheld to verify is is
    // // sensibly defaulted. The following line shows how it COULD be
    // // specified.
    // postgresqlServerName: 'cf' + instanceId,
    postgresqlServerParameters: {
      // // These firewall rules are deliberately withheld to verify they are
      // // sensibly defaulted. The following lines show how they COULD be
      // // specified.
      // allowPostgresqlServerFirewallRules: [
      //   {
      //     ruleName: 'AllowAllIps',
      //     startIpAddress: '0.0.0.0',
      //     endIpAddress: '255.255.255.255'
      //   }
      // ],
      // // These properties are deliberately withheld to verify they are
      // // sensibly defaulted to random values. The following lines show how
      // // they COULD be specified.
      // properties: {
      //   administratorLogin: 'azureuser',
      //   administratorLoginPassword: 'c1oudc0w!@#'
      // },
      tags: {
        foo: 'bar'
      }
    },
    // // The postgresqldbName is deliberately withheld to verify it is
    // // sensibly defaulted. The following line shows how it COULD be
    // // specified.
    // postgresqldbName: 'my_db'
  },
  bindingParameters: {},
  credentials: {
    databaseLogin: '<string>',
    databaseLoginPassword: '<string>',
    postgresqlServerName: '<string>',
    postgresqlServerFullyQualifiedDomainName: '<string>',
    postgresqldbName: '<string>',
    jdbcUrl: '<string>'
  },
  e2e: true
};
testMatrix.push(postgresqldb);

module.exports = testMatrix;
