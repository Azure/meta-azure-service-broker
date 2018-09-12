var common = require('../../lib/common');
var redis = require('redis');
var async = require('async');
var statusCode = require('./statusCode');

module.exports = function() {
  var clientName = 'azurerediscacheClient';
  var log = common.getLogger(clientName);

  this.validateCredential = function(credential, next) {
    log.debug('credential: %j', credential);
    try {
      var client = redis.createClient(credential.sslPort, credential.hostname, {'auth_pass': credential.primaryKey, 'tls': {servername: credential.hostname}});
      client.on('error', function (err) {
        log.error('Client Error: ' + err);
        client.end(false);
      });

      var urlClient = redis.createClient(credential.redisUrl, {'tls': {servername: credential.hostname}});
      urlClient.on('error', function (err) {
        log.error('Client created through url Error: ' + err);
        urlClient.end(false);
      });

      var key = clientName + 'key' + Math.floor(Math.random()*1000);
      var value = clientName + 'value' + Math.floor(Math.random()*1000);
      async.waterfall([
        function(callback) {
          client.set(key, value, function(err, reply) {
            if(!err) {
              callback(null);
            } else {
              log.error('Failed to set a data. Error: ' + err);
              callback(err);
            }
          });
        },
        function(callback) {
          client.get(key,  function(err, reply) {
            if(!err) {
              if(reply == value) {
                callback(null);
              } else {
                log.error('Data not match. expect: ' + value + ' got: ' + reply);
                callback(new Error('value not match'));
              }
            } else {
              log.error('Failed to get data. Error: ' + err);
              callback(err);
            }
          });
        },
        function(callback) {
          urlClient.get(key,  function(err, reply) {
            if(!err) {
              if(reply == value) {
                callback(null);
              } else {
                log.error('Data not match. expect: ' + value + ' got: ' + reply);
                callback(new Error('value not match'));
              }
            } else {
              log.error('Failed to get data. Error: ' + err);
              callback(err);
            }
          });
        }
      ],
      function(err) {
        client.quit();
        urlClient.quit();
        if(err) {
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
