var uuid = require('uuid');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];
var sqlServerName;
var sqldbName;
var azuresqldb;

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
sqlServerName = 'cf' + instanceId;
sqldbName = 'cf' + instanceId;
azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'sqlServerName': sqlServerName,
    'sqlServerParameters': {
      'allowSqlServerFirewallRules': [
        {
          'ruleName': 'test',
          'startIpAddress': '111.111.111.111',
          'endIpAddress': '111.111.111.111'
        }
      ],
      'properties': {
        'administratorLogin': 'azureuser',
        'administratorLoginPassword': 'c1oudc0w!@#'
      },
      'tags': {
        'foo': 'bar'
      }
    },
    'sqldbName': sqldbName,
    'transparentDataEncryption': false,
    'sqldbParameters': {
      'properties': {
        'collation': 'SQL_Latin1_General_CP1_CI_AS'
      },
      'tags': {
        'foo': 'bar'
      }
    }
  },
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'sqlServerName': sqlServerName,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': sqldbName,
    'jdbcUrl': '<string>',
    'jdbcUrlForAuditingEnabled': '<string>',
    'hostname': '<string>',
    'port': 1433,
    'name': '<string>',
    'username': '<string>',
    'password': '<string>',
    'uri': '<string>'
  },
  e2e: false,
  updatingParameters: {
      'sqlServerParameters': {
        'properties': {
          'administratorLoginPassword': 'newPassword425'
        }
      }
  }
};
testMatrix.push(azuresqldb);

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
sqlServerName = 'cf' + instanceId;
sqldbName = 'cf' + instanceId;
azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'location': location,
    'sqlServerName': sqlServerName,
    'sqlServerParameters': {
      'allowSqlServerFirewallRules': [
        {
          'ruleName': 'test',
          'startIpAddress': '0.0.0.0',
          'endIpAddress': '255.255.255.255'
        }
      ],
      'properties': {
        'administratorLogin': 'azureuser',
        'administratorLoginPassword': 'c1oudc0w!@#'
      },
      'tags': {
        'foo': 'bar'
      },
      'connectionPolicy': 'Proxy'
    },
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
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'sqlServerName': sqlServerName,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': sqldbName,
    'jdbcUrl': '<string>',
    'jdbcUrlForAuditingEnabled': '<string>',
    'hostname': '<string>',
    'port': 1433,
    'name': '<string>',
    'username': '<string>',
    'password': '<string>',
    'uri': '<string>'
  },
  e2e: true
};
testMatrix.push(azuresqldb);

module.exports = testMatrix;
