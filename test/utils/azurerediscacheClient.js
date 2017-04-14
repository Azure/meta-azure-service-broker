var common = require('../../lib/common');
var redis = require('redis');
var async = require('async');
var statusCode = require('./statusCode');

module.exports = function() {
  var clientName = 'azurerediscacheClient';
  common.getLogger(clientName, clientName);
  var log = require('winston').loggers.get(clientName);
  
  this.validateCredential = function(credential, next) {
    try {
      var client = redis.createClient(credential.sslPort, credential.hostname, {'auth_pass': credential.primaryKey, 'tls': {servername: credential.hostname}});
      client.on('error', function (err) {
        log.error('Client Error: ' + err);
        client.end(false);
      });
      var key = clientName + 'key' + Math.floor(Math.random()*1000);
      var value = clientName + 'value' + Math.floor(Math.random()*1000);
      async.waterfall([
        function(callback) {
          client.set(key, value, function(err, reply) {
            if(!err) {
              callback(null, statusCode.PASS);
            } else {
              log.error('Failed to set a data. Error: ' + err);
              callback(err);
            }
          });
        },
        function(result, callback) {
          client.get(key,  function(err, reply) {
            if(!err) {
              if(reply == value) {
                callback(null, statusCode.PASS);
              } else {
                log.error('Data not match. expect: ' + value + ' got: ' + reply);
                callback(new Error('value not match'), statusCode.FAIL);
              }
            } else {
              log.error('Failed to get data. Error: ' + err);
              callback(err);
            }
          });
        }
      ],
      function(err, result) {
        if(err || result != statusCode.PASS) {
          next(statusCode.FAIL);
        } else {
          next(statusCode.PASS);
        }
      }); 
  
    } catch(ex) {
      log.error('Got an exception: ' + ex);
      next(statusCode.FAIL);
    }
  };
};
