var uuid = require('uuid');
var util = require('util');
var _ = require('underscore');
var common = require('../../lib/common');

var supportedEnvironments = require('../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;

var environment = process.env['ENVIRONMENT'];
if (!_.has(supportedEnvironments, environment)) {
  throw new Error(util.format('The test does not support %s', environment));
}

var sqlServerName, sqldbName, azuresqldb, administratorLogin, administratorLoginPassword;

var servers = common.getConfigurations().accountPool.sqldb;
for (var server in servers) {
  if (servers.hasOwnProperty(server)) {
    sqlServerName = server;
    administratorLogin = servers[server]['administratorLogin'];
    administratorLoginPassword = servers[server]['administratorLoginPassword'];
  }
}

instanceId = uuid.v4();
bindingId = uuid.v4();
sqldbName = 'cf' + instanceId;
azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'sqlServerName': sqlServerName,
    'sqldbName': sqldbName,
    'transparentDataEncryption': true,
    'sqldbParameters': {
      'properties': {
        'collation': 'SQL_Latin1_General_CP1_CI_AS'
      },
      'tags': {
        'foo': 'bar'
      }
    }
  },
  envProvisioningParameters: {
    administratorLogin: administratorLogin,
    administratorLoginPassword: administratorLoginPassword
  },
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'sqlServerName': sqlServerName,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': sqldbName,
    'jdbcUrl': '<string>',
    'jdbcUrlForAuditingEnabled': '<string>'
  },
  e2e: true
};
testMatrix.push(azuresqldb);

module.exports = testMatrix;