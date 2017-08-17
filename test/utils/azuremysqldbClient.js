var common = require('../../lib/common');
var statusCode = require('./statusCode');
var async = require('async');
var util = require('util');
var mysql = require('mysql2');

var MAX_RETRY = 3;

module.exports = function(environment) {
  var clientName = 'azuremysqldbClient';
  var log = common.getLogger(clientName);

  this.validateCredential = function validateCredential(credential, next, retryCount) {
    if (retryCount === undefined) {
      retryCount = 0;
    }
    
    if (retryCount > 0) {
      log.info('Retry E2E test, retryCount: %d', retryCount);
    }

    var uri = credential.uri;
    
    function nextStep(err, message, callback) {
      if (err) {
        log.error(message + ' Error: %j', 'not ', err);
        callback(err);
      } else {
        log.debug(message, '');
        callback(null);
      }
    }

    var tableName = 'testtable' + Math.floor((Math.random() * 10000) + 1);
    
    var conn = mysql.createConnection(uri);
    async.waterfall([
      function(callback) {
        log.debug('Connecting to MySQL DB with uri: %s', uri);
        conn.connect(function(err) {
          var message = 'The MySQL DB can %sbe connected.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        log.debug('Switching to MySQL database %s', credential.mysqlDatabaseName);
        conn.query('USE ' + credential.mysqlDatabaseName, function(err) {
          var message = 'The user can %sswtich to MySQL Database.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        var query = util.format('CREATE TABLE %s(aaa char(10))', tableName);
        conn.query(query, function(err) {
          var message = 'The user can %screate a new table on the MySQL Database.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        var qurey = util.format('INSERT INTO %s(aaa) values (\'bbb\')', tableName);
        conn.query(qurey, function(err) {
          var message = 'The user can %sinsert a new row to the new table.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        var qurey = util.format('SELECT * FROM %s', tableName);
        conn.query(qurey, function(err) {
          var message = 'The user can %sget the row inserted.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        conn.query('CREATE DATABASE testdb', function(err) {
          var message = 'The user can %screate another new database on the MySQL Server.';
          nextStep(err, message, callback);
        });
      }
    ],function(err){
      conn.end();
      if (err) {
        if (retryCount < MAX_RETRY) {
          log.warn('E2E test failed. It is going to retry.');
          setTimeout(function(){validateCredential(credential, next, retryCount + 1);}, 3000);
        } else {
          next(statusCode.FAIL);
        }
      } else {
        next(statusCode.PASS);
      }
    });
  };

};