/* jshint camelcase: false */
/* jshint newcap: false */
var util = require('util');
var urlencode = require('urlencode');

var cacheBind = function(params) {
  var reqParams = params.parameters || {};
  var resourceGroup = reqParams.resourceGroup || '';
  var cacheName = reqParams.cacheName || '';
  var provisioningResult = params.provisioning_result;

  this.bind = function(redis, callback) {
    redis.bind(resourceGroup, cacheName, function(err, accessKeys) {
      if (err) {
        return callback(err);
      }
      var urlSchema, urlPort;
      var enableNonSslPort = null;
      if (reqParams.parameters) {
        enableNonSslPort = reqParams.parameters.enableNonSslPort;
      }
      if (!enableNonSslPort) {
        urlSchema = 'rediss';
        urlPort = 6380;
      } else {
        urlSchema = 'redis';
        urlPort = 6379;
      }
      var redisUrl = util.format('%s://%s:%s@%s:%s',
        urlSchema,
        provisioningResult.name,
        urlencode(accessKeys.primaryKey),
        provisioningResult.hostName,
        urlPort);
      var credentials = {
        name: provisioningResult.name,
        hostname: provisioningResult.hostName,
        port: provisioningResult.port,
        sslPort: provisioningResult.sslPort,
        primaryKey: accessKeys.primaryKey,
        secondaryKey: accessKeys.secondaryKey,
        redisUrl: redisUrl
      };
      return callback(null, credentials);
    });
  };
};

module.exports = cacheBind;
