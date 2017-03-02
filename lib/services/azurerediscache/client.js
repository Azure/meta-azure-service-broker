/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var util = require('util');

var azureProperties;
var API_VERSIONS;
var environment;
var log;

var redisUrlTemplate = '%ssubscriptions/%s/resourceGroups/%s/providers/Microsoft.Cache/Redis/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, cacheName

exports.initialize = function(azure, logger) {

  log = logger;
  azureProperties = azure;
  API_VERSIONS = common.API_VERSION[azure.environment];
  environment = common.getEnvironment(azure.environment);
};

function getRedis(resourceGroupName, cacheName, callback){
  msRestRequest.GET(
    util.format(
      redisUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      cacheName),
    common.mergeCommonHeaders(log, 'RedisCache - getRedis', {}),
    API_VERSIONS.REDIS,
    callback
  );
}

exports.provision = function(resourceGroupName, cacheName, parameters, callback) {
  getRedis(resourceGroupName, cacheName,
    function (err, res, body) {
      common.logHttpResponse(log, res, 'RedisCache - getRedis', false);
      if (err) {
        return callback(err);
      }
      
      if (res.statusCode != HttpStatus.NOT_FOUND) {
        var error = Error('The cache name is not available.');
        error.statusCode = HttpStatus.CONFLICT;
        return callback(error);
      }
      
      msRestRequest.PUT(
        util.format(
          redisUrlTemplate,
          environment.resourceManagerEndpointUrl,
          azureProperties.subscriptionId,
          resourceGroupName,
          cacheName),
        common.mergeCommonHeaders(log, 'RedisCache - create', {}),
        {'location': parameters.location, 'properties':parameters},
        API_VERSIONS.REDIS,
        function (err, res, body) {
          common.logHttpResponse(log, res, 'RedisCache - createRedis', false);
          if (err) {
            return callback(err);
          }
          if (res.statusCode != HttpStatus.CREATED) {
            return common.formatErrorFromRes(res, callback);
          }
          
          callback(null, body.properties);
        }
      );
    }
  );
};

exports.poll = function(resourceGroupName, cacheName, callback) {
  getRedis(resourceGroupName, cacheName,
    function (err, res, body) {
      common.logHttpResponse(log, res, 'RedisCache - getRedis', false);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK) {
        var e = new Error(body);
        e.statusCode = res.statusCode;
        return callback(e);
      }
      
      callback(null, JSON.parse(body).properties);
    }
  );
};

exports.deprovision = function(resourceGroupName, cacheName, callback) {
  msRestRequest.DELETE(
    util.format(
      redisUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      cacheName),
    common.mergeCommonHeaders(log, 'RedisCache - delete', {}),
    API_VERSIONS.REDIS,
    function(err, res, body) {
      common.logHttpResponse(log, res, 'RedisCache - delete', true);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK && res.statusCode != HttpStatus.NO_CONTENT) {
        return common.formatErrorFromRes(res, callback);
      }
      
      callback(null, body);
    }
  );
};

exports.bind = function(resourceGroupName, cacheName, callback) {
  msRestRequest.POST(
    util.format(
      redisUrlTemplate + '/listKeys',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      cacheName),
    common.mergeCommonHeaders(log, 'RedisCache - listKeys', {}),
    null,
    API_VERSIONS.REDIS,
    function(err, res, body) {
      common.logHttpResponse(log, res, 'RedisCache - listKeys', false);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK) {
        return common.formatErrorFromRes(res, callback);
      }
      
      callback(null, JSON.parse(body));
    }
  );
};

// exports.unbind = function(callback) {
// there is nothing to do for 'unbind' with redisCache
// }
