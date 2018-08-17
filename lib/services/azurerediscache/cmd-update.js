/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var common = require('../../common/');
var Config = require('./service');
var HttpStatus = require('http-status-codes');
var log = common.getLogger(Config.name);
var deepExtend = require('deep-extend');

var cacheUpdate = function(params) {

  var updatedInstance = params.instance;
  var resourceGroupName = updatedInstance.parameters.resourceGroup || '';
  var cacheName = updatedInstance.parameters.cacheName || '';
  updatedInstance['last_operation'] = 'update';

  this.update = function(redis, next) {
    var requestedParameters = params.requested.parameters;
    if (requestedParameters && requestedParameters.parameters && requestedParameters.parameters.enableNonSslPort) {
      if (!_.isBoolean(requestedParameters.parameters.enableNonSslPort)) {
        return next(Error('Value of enableNonSslPort should be boolean'));
      }
      updatedInstance.parameters.parameters.enableNonSslPort = requestedParameters.parameters.enableNonSslPort;
    }

    var updatedInstanceCopy = deepExtend({}, updatedInstance);
    var reqParams = updatedInstanceCopy.parameters;

    var requestedPlanId = params.requested['plan_id'];
    if (requestedPlanId) {
      updatedInstance['plan_id'] = requestedPlanId;
      Config.plans.forEach(function (item) {
        if (requestedPlanId === item.id) {
          reqParams.parameters.sku = {
            name: item.metadata.details.name,
            family: item.metadata.details.family,
            capacity: item.metadata.details.capacity
          };
        }
      });
    }

    log.debug('Redis Cache, redis.update, resourceGroupName: %s, cacheName: %s', resourceGroupName, cacheName);
    reqParams.tags = common.mergeTags(reqParams.tags);
    log.debug('Redis Cache, redis.update, reqParams: %j', reqParams);
    redis.update(resourceGroupName, cacheName, reqParams, function(err, result) {
      if (err) {
        log.debug('Redis Cache, redis.update, err: %j', err);
        log.debug('Redis Cache, redis.update, result: %j', result);
        return next(err);
      }
      var reply = {
        statusCode: HttpStatus.ACCEPTED,
        code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
        value: {
          state: 'in progress',
          description: 'Azure accepted redis cache update request for ' + cacheName
        }
      };
      return next(null, reply, updatedInstance);
    });
  };

};

module.exports = cacheUpdate;
