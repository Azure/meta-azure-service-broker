/*jshint camelcase: false */
var uuid = require('uuid');
var async = require('async');

var sqldb = require('../../../lib/services/azuresqldb/');
var common = require('../../../lib/common/');

var supportedEnvironments = require('../../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;
var resourceGroupName;

var environment = process.env['ENVIRONMENT'];

var location = supportedEnvironments[environment]['location'];
var secLocation = supportedEnvironments[environment]['secLocation'];
var azuresqldbfg;

instanceId = uuid.v4();
bindingId = uuid.v4();
var resourceGroupName = 'cloud-foundry-' + instanceId;
var primaryServerName = 'cf' + instanceId;
var primaryDbName = 'cf' + instanceId;
var secondaryServerName = primaryServerName + '-2';
var failoverGroupName = primaryServerName + '-fg';

var serverPool;
if (process.env['AZURE_SQLDB_SQL_SERVER_POOL']) {
  serverPool = JSON.parse(process.env['AZURE_SQLDB_SQL_SERVER_POOL']);
} else {
  serverPool = [];
}
serverPool.push({
  'resourceGroup': resourceGroupName,
  'location': location,
  'sqlServerName': primaryServerName,
  'administratorLogin': 'azureuser',
  'administratorLoginPassword': 'c1oudc0w!@#'
});
serverPool.push({
  'resourceGroup': resourceGroupName,
  'location': secLocation,
  'sqlServerName': secondaryServerName,
  'administratorLogin': 'azureuser',
  'administratorLoginPassword': 'c1oudc0w!@#'
});
var envVars = {
  'AZURE_SQLDB_SQL_SERVER_POOL': JSON.stringify(serverPool)
};

azuresqldbfg = {
  serviceName: 'azure-sqldb-failover-group',
  serviceId: '5b4c1577-fc23-491e-bfca-a01d00eee5b8',
  planId: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'resourceGroup': resourceGroupName,
    'primaryServerName': primaryServerName,
    'primaryDbName': primaryDbName,
    'secondaryServerName': secondaryServerName,
    'failoverGroupName': failoverGroupName
  },
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'sqlServerName': failoverGroupName,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': primaryDbName,
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
        'sqlServerName': primaryServerName,
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
        'sqldbName': primaryDbName,
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
      opParams.last_operation = 'provision';
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
          });
        },
        function(err) {
          if (err) return callback(err);
          delete opParams.last_operation;
          delete opParams.defaultSettings;
          opParams.parameters.sqlServerName = secondaryServerName;
          opParams.parameters.sqldbName = 'cf' + uuid.v4();
          opParams.parameters.location = secLocation;
          sqldb.provision(opParams, function(err) {
            if (err) return callback(err);
            callback(null);
          });
        }
      );
    });
  }
};
testMatrix.push(azuresqldbfg);

module.exports = testMatrix;
