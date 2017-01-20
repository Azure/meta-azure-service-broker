var logule = require('logule');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');
var async = require('async');

module.exports = function(environment) {
  var clientName = 'azuresqldbClient';
  var log = logule.init(module, clientName);

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
  }
}
