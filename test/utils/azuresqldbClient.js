var common = require('../../lib/common');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');
var async = require('async');
var msRestRequest = require('../../lib/common/msRestRequest');
var util = require('util');
var _ = require('underscore');
var broker = require('../../brokerserver');

module.exports = function(environment) {
  var clientName = 'azuresqldbClient';
  common.getLogger(clientName, clientName);
  var log = require('winston').loggers.get(clientName);

  this.validateCredential = function(credential, next) {
    var Connection = require('tedious').Connection;
    var Request = require('tedious').Request;

    var serverSuffix = supportedEnvironments[environment]['sqlServerEndpointSuffix'];
    var config = {
      userName: credential.databaseLogin,
      password: credential.databaseLoginPassword,
      server: credential.sqlServerName + serverSuffix,
      options: {encrypt: true, database: credential.sqldbName}
    };

    function nextStep(err, message, callback) {
      if (err) {
        log.error(message + ' Error: %j', 'not ', err);
        callback(err);
      } else {
        log.debug(message, '');
        callback(null);
      }
    }

    var connection;
    async.waterfall([
      function(callback) {
        log.debug('Connecting to SQL server %s%s and database %s', credential.sqlServerName, serverSuffix, credential.sqldbName);
        connection = new Connection(config);
        connection.on('connect', function(err) {
          var message = 'The SQL Database can %sbe connected.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        var request = new Request('CREATE TABLE testtable(aaa char(10))', function(err) {
          var message = 'The user can %screate a new table in the SQL Database.';
          nextStep(err, message, callback);
        });
        connection.execSql(request);
      },
      function(callback) {
        var request = new Request('INSERT INTO testtable(aaa) values (\'bbb\')', function(err) {
          var message = 'The user can %sinsert a new row to the new table.';
          nextStep(err, message, callback);
        });
        connection.execSql(request);
      },
      function(callback) {
        var request = new Request('SELECT * FROM testtable', function(err) {
          var message = 'The user can %sget the row inserted.';
          nextStep(err, message, callback);
        });
        connection.execSql(request);
      }
    ],function(err){
      connection.close();
      if (err) {
        next(statusCode.FAIL);
      } else {
        next(statusCode.PASS);
      }
    });
  };

  this.validateProvisioning = function(service, next) {
    // Check that TDE is set properly by querrying the database symbolic table and comparing
    // the value of is_encrypted to the TDE value used for provisionning

    // Quick exit because the connection will fail since the firewall rule is restrictive.
    if (service.e2e !== true){
      log.debug('Skipping since this is not an End to End test');
      return next(null);
    }

    var Connection = require('tedious').Connection;
    var Request = require('tedious').Request;
    var sqlserverName = service.provisioningParameters.sqlServerName;
    var sqldbName = service.provisioningParameters.sqldbName;
    var serverSuffix = supportedEnvironments[environment]['sqlServerEndpointSuffix'];
    var expectedTDE = service.provisioningParameters.transparentDataEncryption;
    var actualTDE = null;
    var connection;

    var userName, password;
    if (service.provisioningParameters.sqlServerParameters) {
      userName = service.provisioningParameters.sqlServerParameters.properties.administratorLogin;
      password = service.provisioningParameters.sqlServerParameters.properties.administratorLoginPassword;
    } else {
      userName = service.envProvisioningParameters.administratorLogin;
      password = service.envProvisioningParameters.administratorLoginPassword;
    }
    var config = {
      userName: userName,
      password: password,
      server: sqlserverName + serverSuffix,
      options: {encrypt: true, database: sqldbName}
    };

    function nextStep(err, message, callback) {
      if (err) {
        log.error(message + ' Error: %j', 'not ', err);
        callback(err);
      } else {
        log.debug(message, '');
        callback(null);
      }
    }

    async.waterfall([
      function(callback) {
        log.debug('Connecting to SQL server %s%s and database %s', sqlserverName, serverSuffix, sqldbName);
        connection = new Connection(config);
        connection.on('connect', function(err) {
          var message = 'The SQL Database can %sbe connected.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        var request = new Request('SELECT name, is_encrypted FROM sys.databases', function(err) {
          var message = 'The user can %sget the rows.';
          nextStep(err, message, callback);
        });

        request.on('row', function(row) {
          if (row[0].value === sqldbName){
            actualTDE = row[1].value;
            log.debug('Detected TDE to be %j', actualTDE);
          }
        });

        connection.execSql(request);
      },
      function(callback) {
        if (actualTDE === expectedTDE){
          nextStep(null, 'Success TDE is the expected value', callback);
        } else {
          var err = new Error('TDE should be ' + expectedTDE + ' but is ' + actualTDE);
          nextStep(err, 'TDE is %sthe expected value', callback);
        }
      }
    ],function(err){
      connection.close();
      next(err);
    });
  };

  this.validateUpdate = function (service, next) {
    if (service.updateParameters){
      async.waterfall([
        function (callback){
          // Actually change the server password so that the rest of the lifecycle does not fail.
          log.debug('Modifying the sqlserver password');
          var environmentName = process.env['ENVIRONMENT'];
          var subscriptionId = process.env['SUBSCRIPTION_ID'];
          var API_VERSIONS = common.API_VERSION[environmentName];
          var environment = common.getEnvironment(environmentName);
          var resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
          var resourceGroupName = service.provisioningParameters.resourceGroup;
          var sqlServerName = service.provisioningParameters.sqlServerName;

          var serverUrl = util.format('%s/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Sql/servers/%s',
            resourceManagerEndpointUrl,
            subscriptionId,
            resourceGroupName,
            sqlServerName);

          var standardHeaders = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept': 'application/json'
          };

          var headers = common.mergeCommonHeaders('sqldb client - createServer', standardHeaders);
          var params = _.extend({}, service.updateParameters.sqlServerParameters);
          params.location = service.provisioningParameters.location;

          msRestRequest.PUT(serverUrl, headers, params, API_VERSIONS.SQL, function (err, res, body) {
            log.debug('Modify request body : %j', body);
            return callback(err);
          });
        },
        function (callback){
          broker.db.getServiceInstance(service.instanceId, callback);
        },
        function(instance, callback){
          // Validate password change in instance
          var newPassword = service.updateParameters.sqlServerParameters.properties.administratorLoginPassword;
          if (instance.parameters.sqlServerParameters.properties.administratorLoginPassword !== newPassword) {
            return callback(new Error('New password is wrong in provisionning parameters'));
          }

          if (instance['provisioning_result'].administratorLoginPassword !== newPassword) {
            return callback(new Error('New password is wrong in provisionning result'));
          }
          callback(null);
        }
      ],
      function(err, result){
        next(err);
      });
    }
    else{
      // No update
      return next(null);
    }
  };
};
