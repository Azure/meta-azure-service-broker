var common = require('../../lib/common');
var statusCode = require('./statusCode');
var async = require('async');

module.exports = function(environment) {
  var clientName = 'azurepostgresqldbClient';
  var log = common.getLogger(clientName);

  this.validateCredential = function(credential, next) {
    var pg = require('pg');

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

    var client = new pg.Client(uri);
    async.waterfall([
      function(callback) {
        log.debug('Connecting to PostgreSQL DB with uri: %s', uri);
        client.connect(function(err) {
          var message = 'The PostgreSQL DB can %sbe connected.';
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