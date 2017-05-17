var common = require('../../lib/common');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');
var async = require('async');
var util = require('util');

module.exports = function(environment) {
  var clientName = 'azuremysqldbClient';
  var log = common.getLogger(clientName);

  this.validateCredential = function(credential, next) {
    var mysql = require('mysql2');
    
    var serverSuffix = supportedEnvironments[environment]['mysqlServerEndpointSuffix'];
    var config = {
        host: credential.mysqlServerName + serverSuffix,
        user: util.format('%s@%s',  credential.administratorLogin, credential.mysqlServerName),
        password: credential.administratorLoginPassword,
        database: 'mysql',
        port: 3306
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

    var conn = mysql.createConnection(config);
    async.waterfall([
      function(callback) {
        log.debug('Connecting to MySQL server %s%s', credential.mysqlServerName, serverSuffix);
        conn.connect(function(err) {
          var message = 'The MySQL Server can %sbe connected.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('CREATE DATABASE testdb', function(err) {
          var message = 'The user can %screate a new database in the MySQL Server.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('USE testdb', function(err) {
          var message = 'The user can %sswitch to the new database in the MySQL Server.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('CREATE TABLE testtable(aaa char(10))', function(err) {
          var message = 'The user can %screate a new table in the MySQL Database.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('INSERT INTO testtable(aaa) values (\'bbb\')', function(err) {
          var message = 'The user can %sinsert a new row to the new table.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('SELECT * FROM testtable', function(err) {
          var message = 'The user can %sget the row inserted.';
          nextStep(err, message, callback);
        });
      }
    ],function(err){
      conn.end();
      if (err) {
        next(statusCode.FAIL);
      } else {
        next(statusCode.PASS);
      }
    });
  };

};