var common = require('../../lib/common');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');
var async = require('async');
var util = require('util');

module.exports = function(environment) {
  var clientName = 'azurepostgresqldbClient';
  var log = common.getLogger(clientName);

  this.validateCredential = function(credential, next) {
    var pg = require('pg');
    
    var serverSuffix = supportedEnvironments[environment]['postgresqlServerEndpointSuffix'];
    var config = {
      user: util.format('%s@%s',  credential.administratorLogin, credential.postgresqlServerName),
      database: 'postgres',
      password: credential.administratorLoginPassword,
      host: credential.postgresqlServerName + serverSuffix,
      port: 5432,
      max: 10, // max number of clients in the pool
      idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
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

    var client = new pg.Client(config);
    async.waterfall([
      function(callback) {
        log.debug('Connecting to PostgreSQL server %s%s', credential.postgresqlServerName, serverSuffix);
        client.connect(function(err) {
          var message = 'The PostgreSQL Server can %sbe connected.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        client.query('CREATE DATABASE testdb', function(err) {
          var message = 'The user can %screate a new database in the PostgreSQL Server.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        client.end();
        config.database = 'testdb';
        client = new pg.Client(config);
        client.connect(function(err) {
          var message = 'The user can %sconnect to the new database in the PostgreSQL Server.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        client.query('CREATE TABLE testtable(aaa char(10))', function(err) {
          var message = 'The user can %screate a new table in the PostgreSQL Database.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        client.query('INSERT INTO testtable(aaa) values (\'bbb\')', function(err) {
          var message = 'The user can %sinsert a new row to the new table.';
          nextStep(err, message, callback);
        });
      },
      function(callback) {
        client.query('SELECT * FROM testtable', function(err) {
          var message = 'The user can %sget the row inserted.';
          nextStep(err, message, callback);
        });
      }
    ],function(err){
      client.end();
      if (err) {
        next(statusCode.FAIL);
      } else {
        next(statusCode.PASS);
      }
    });
  };

};