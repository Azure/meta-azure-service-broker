/*jshint camelcase: false */
var uuid = require('uuid');
var async = require('async');

var supportedEnvironments = require('../../utils/supportedEnvironments');
var common = require('../../../lib/common/');
var sqldb = require('../../../lib/services/azuresqldb/');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];
var sqlServerName;
var sqldbName;
var sqldbNamePre;
var azuresqldb;

instanceId = uuid.v4();
bindingId = uuid.v4();
resourceGroupName = 'cloud-foundry-' + instanceId;
sqlServerName = 'cf' + instanceId;
sqldbName = 'cf' + instanceId;
sqldbNamePre = sqldbName + 'pre';

var serverPool = [];

serverPool.push({
  'resourceGroup': resourceGroupName,
  'location': location,
  'sqlServerName': sqlServerName,
  'administratorLogin': 'azureuser',
  'administratorLoginPassword': 'c1oudc0w!@#'
});
var envVars = {
  'AZURE_SQLDB_SQL_SERVER_POOL': JSON.stringify(serverPool)
};

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
  envVars: envVars,
  preProvision: function(callback) {
    var opParams = {
      'organization_guid': uuid.v4(),
      'plan_id': '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
      'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
      'space_guid': uuid.v4(),
      'privilege': {
        'sqldb': {
          'allowToCreateSqlServer': true
        }
      },
      'accountPool': { 'sqldb': {} },
      'parameters': {
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
          }
        },
        'sqldbName': sqldbNamePre,
        'sqldbParameters': {
          'properties': {
            'collation': 'SQL_Latin1_General_CP1_CI_AS'
          }
        }
      },
      'azure': common.getConfigurations().azure
    };
    sqldb.provision(opParams, function(err) {
      if (err) return callback(err);

      opParams.parameters.sqlServerName = sqlServerName;
      opParams.parameters.sqldbName = 'cf' + uuid.v4();
      opParams.parameters.location = location;
      sqldb.provision(opParams, function(err) {
        if (err) return callback(err);
        opParams.parameters.sqlServerName = sqlServerName;
        opParams.parameters.sqldbName = sqldbNamePre;
        opParams.parameters.location = location;
        opParams.last_operation = 'provision';
        opParams.provisioning_result = {
          'resourceGroup': resourceGroupName
        };
        opParams.defaultSettings = {sqldb: {transparentDataEncryption: false}};
        var state;
        async.whilst(
          function() {
            return (state !== 'succeeded');
          },
          function(cb) {
            sqldb.poll(opParams, function(err, lastOp, result) {
              if (err) return cb(err);
              state = result.value.state;
              cb(null);
            });
          },
          function(err) {
            callback(err);
          }
        );
      });
    });
  }
};

testMatrix.push(azuresqldb);

var instanceId2 = uuid.v4();
var bindingId2 = uuid.v4();
var resourceGroupName2 = 'cloud-foundry-' + instanceId2;
var sqlServerName2 = 'cf' + instanceId2;
var sqldbName2 = 'cf' + instanceId2;
var sqldbNamePre2 = sqldbName + 'pre';

var serverPool2 = [];

serverPool2.push({
  'resourceGroup': resourceGroupName2,
  'location': location,
  'sqlServerName': sqlServerName2,
  'administratorLogin': 'azureuser',
  'administratorLoginPassword': 'c1oudc0w!@#'
});
var envVars2 = {
  'AZURE_SQLDB_SQL_SERVER_POOL': JSON.stringify(serverPool2)
};

azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId2,
  bindingId: bindingId2,
  provisioningParameters: {
    'resourceGroup': resourceGroupName2,
    'location': location,
    'sqlServerName': sqlServerName2,
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
    'sqldbName': sqldbName2,
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
    'sqlServerName': sqlServerName2,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': sqldbName2,
    'jdbcUrl': '<string>',
    'jdbcUrlForAuditingEnabled': '<string>',
    'hostname': '<string>',
    'port': 1433,
    'name': '<string>',
    'username': '<string>',
    'password': '<string>',
    'uri': '<string>'
  },
  e2e: true,
  envVars: envVars2,
  preProvision: function(callback) {
    var opParams = {
      'organization_guid': uuid.v4(),
      'plan_id': '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
      'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
      'space_guid': uuid.v4(),
      'privilege': {
        'sqldb': {
          'allowToCreateSqlServer': true
        }
      },
      'accountPool': { 'sqldb': {} },
      'parameters': {
        'resourceGroup': resourceGroupName2,
        'location': location,
        'sqlServerName': sqlServerName2,
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
          }
        },
        'sqldbName': sqldbNamePre2,
        'sqldbParameters': {
          'properties': {
            'collation': 'SQL_Latin1_General_CP1_CI_AS'
          }
        }
      },
      'azure': common.getConfigurations().azure
    };
    sqldb.provision(opParams, function(err) {
      if (err) return callback(err);

      opParams.parameters.sqlServerName = sqlServerName2;
      opParams.parameters.sqldbName = 'cf' + uuid.v4();
      opParams.parameters.location = location;
      sqldb.provision(opParams, function(err) {
        if (err) return callback(err);
        opParams.parameters.sqlServerName = sqlServerName2;
        opParams.parameters.sqldbName = sqldbNamePre2;
        opParams.parameters.location = location;
        opParams.last_operation = 'provision';
        opParams.provisioning_result = {
          'resourceGroup': resourceGroupName2
        };
        opParams.defaultSettings = {sqldb: {transparentDataEncryption: false}};
        var state;
        async.whilst(
          function() {
            return (state !== 'succeeded');
          },
          function(cb) {
            sqldb.poll(opParams, function(err, lastOp, result) {
              if (err) return cb(err);
              state = result.value.state;
              cb(null);
            });
          },
          function(err) {
            callback(err);
          }
        );
      });
    });
  }
};
testMatrix.push(azuresqldb);

module.exports = testMatrix;
