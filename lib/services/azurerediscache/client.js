/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var AzureMgmtRedisCache = require('azure-arm-rediscache');
var HttpStatus = require('http-status-codes');
var common = require('../../common/');

var redis;

var log;

exports.initialize = function(azure, logger) {

  log = logger;
    
  var environment = common.getEnvironment(azure.environment);
  var options = {
      environment: environment
  };

  var appTokenCreds = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);

  var rc = new AzureMgmtRedisCache(appTokenCreds, azure.subscriptionId, environment.resourceManagerEndpointUrl);
  redis = rc.redis;    
};

exports.provision = function(resourceGroup, cacheName, parameters, next) {
  var options = common.generateCustomHeaders(log, 'RedisCache - checkNameAvailability');
  redis.list(options, function (err, result, request, response) {
    common.logHttpResponse(log, response, 'RedisCache - checkNameAvailability', true);
    result.forEach(function (cache) {
      if (cache.name == cacheName) {
        var error = Error('The cache name is not available.');
        error.statusCode = HttpStatus.CONFLICT;
        return next(error);
      }
    });
        
    var options = common.generateCustomHeaders(log, 'RedisCache - createOrUpdate');
    redis.createOrUpdate(resourceGroup, cacheName, parameters, options, function(err, result, request, response) {
      common.logHttpResponse(log, response, 'RedisCache - createOrUpdate', false);
      next(err, result);
    });
  });
};

exports.poll = function(resourceGroup, cacheName, next) {
  var options = common.generateCustomHeaders(log, 'RedisCache - get');
  redis.get(resourceGroup, cacheName, options, function(err, result, request, response) {
    common.logHttpResponse(log, response, 'RedisCache - get', true);
    next(err, result);
  });
};

exports.deprovision = function(resourceGroup, cacheName, next) {
  var options = common.generateCustomHeaders(log, 'RedisCache - deleteMethod');
  redis.deleteMethod(resourceGroup, cacheName, options, function(err, result, request, response) {
    common.logHttpResponse(log, response, 'RedisCache - deleteMethod', true);
    next(err, result);
  });
};

exports.bind = function(resourceGroup, cacheName, next) {
  var options = common.generateCustomHeaders(log, 'RedisCache - listKeys');
  redis.listKeys(resourceGroup, cacheName, options, function(err, result, request, response) {
    common.logHttpResponse(log, response, 'RedisCache - listKeys', false);
    next(err, result);
  });
};

// exports.unbind = function(next) {
// there is nothing to do for 'unbind' with redisCache
// }
