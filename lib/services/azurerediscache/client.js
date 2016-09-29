/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var AzureMgmtRedisCache = require('azure-arm-rediscache');
var HttpStatus = require('http-status-codes');
var common = require('../../common/');

var redis;

var log;

exports.instantiate = function(azure, logger) {

  var log = logger;
    
  var environment = common.getEnvironment(azure.environment);
  var options = {
      environment: environment
  };

  var appTokenCreds = new msRestAzure.ApplicationTokenCredentials(
      azure.client_id, azure.tenant_id, azure.client_secret, options);

  var rc = new AzureMgmtRedisCache(appTokenCreds, azure.subscription_id, environment.resourceManagerEndpointUrl);
  redis = rc.redis;    
};

exports.provision = function(resourceGroup, cacheName, parameters, next) {
  redis.list(function (err, result, request, response) {
    common.logHttpResponse(log, response, 'Check Redis Cache name availability', true);
    result.forEach(function (cache) {
      if (cache.name == cacheName) {
        var error = Error('The cache name is not available.');
        error.statusCode = HttpStatus.CONFLICT;
        return next(error);
      }
    });
        
    redis.createOrUpdate(resourceGroup, cacheName, parameters, function(err, result, request, response) {
      common.logHttpResponse(log, response, 'Create or update Redis Cache', true);
      next(err, result);
    });
  });
};

exports.poll = function(resourceGroup, cacheName, next) {
    redis.get(resourceGroup, cacheName, function(err, result, request, response) {
        common.logHttpResponse(log, response, 'Get Redis Cache', true);
        next(err, result);
    });
};

exports.deprovision = function(resourceGroup, cacheName, next) {
    redis.deleteMethod(resourceGroup, cacheName, function(err, result, request, response) {
        common.logHttpResponse(log, response, 'Delete Redis Cache', true);
        next(err, result);
    });
};

// exports.bind = function(next) {
// there is nothing to do for 'bind' with redisCache
// }

// exports.unbind = function(next) {
// there is nothing to do for 'unbind' with redisCache
// }
