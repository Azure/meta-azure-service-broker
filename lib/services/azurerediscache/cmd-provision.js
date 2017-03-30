/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var common = require('../../common/');
var resourceGroup = require('../../common/resourceGroup-client');
var Config = require('./service');
var log = common.getLogger(Config.name);

var cacheProvision = function(params) {

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = reqParams.resourceGroup || '';
  var cacheName = reqParams.cacheName || '';

  var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

  var location = '';
  if (parametersDefined) {
    location = reqParams.parameters.location || '';
  }

  this.provision = function(redis, next) {
      
    var groupParameters = {
        location: location
    };

    async.waterfall([
      function(callback) {
          resourceGroup.createOrUpdate('Redis Cache', params.azure, resourceGroupName, groupParameters, callback);
      },
      function(callback) {
        log.debug('Redis Cache, redis.provision, resourceGroupName: %j', resourceGroupName);
        log.debug('Redis Cache, redis.provision, cacheName: %j', cacheName);
        var redisParams = reqParams.parameters;
        redisParams.tags = common.mergeTags(redisParams.tags);
        log.debug('Redis Cache, redis.provision, reqParams.parameters: %j', redisParams);
        redis.provision(resourceGroupName, cacheName, redisParams, function(err, result) {
          if (err) {
            log.debug('Redis Cache, redis.provision, err: %j', err);
            log.debug('Redis Cache, redis.provision, result: %j', result);
            return callback(err);
          } else {
            delete result.accessKeys;
            result.resourceGroupName = resourceGroupName;
            result.name = cacheName;
            callback(err, result);
          }
        });    
      }
    ], function(err, result){
      next(err, result);
    });        
  };

  //  Validators

  this.skuIsSelfConsistent = function() {
    if (reqParams.parameters.sku.name.toLowerCase() === 'basic') {
      if (reqParams.parameters.sku.family.toLowerCase() === 'c') {
        if ((reqParams.parameters.sku.capacity >= 0) && (reqParams.parameters.sku.capacity <= 6)) return true;
      }
    }
    if (reqParams.parameters.sku.name.toLowerCase() === 'standard') {
      if (reqParams.parameters.sku.family.toLowerCase() === 'c') {
        if ((reqParams.parameters.sku.capacity >= 0) && (reqParams.parameters.sku.capacity <= 6)) return true;
      }
    }
    if (reqParams.parameters.sku.name.toLowerCase() === 'premium') {
      if (reqParams.parameters.sku.family.toLowerCase() === 'p') {
        if ((reqParams.parameters.sku.capacity >= 1) && (reqParams.parameters.sku.capacity <= 4)) return true;
      }
    }
    log.error('Redis Cache Provision: SKU is not self-consistent');
    return false;
  };

  this.nonSslPortIsBoolean = function() {
    if (_.isBoolean(reqParams.parameters.enableNonSslPort)) return true;

    log.error('Redis Cache Provision: enableNonSslPort must be boolean.');
    return false;
  };

  this.instanceIdWasProvided = function() {
    if (_.isString(instanceId)) {
      if (instanceId.length !== 0) return true;
    }

    log.error('Redis Cache Provision: instanceId was not provided.');
    return false;
  };

  this.resourceGroupWasProvided = function() {
    if (_.isString(resourceGroupName)) {
      if (resourceGroupName.length !== 0) return true;
    }

    log.error('Redis Cache Provision: Resource Group name was not provided. Did you supply the parameters file?');
    return false;
  };

  this.cacheNameWasProvided = function() {
    if (_.isString(cacheName)) {
      if (cacheName.length !== 0) return true;
    }

    log.error('Redis Cache Provision: Cache name was not provided.');
    return false;
  };

  this.allValidatorsSucceed = function() {
    return this.instanceIdWasProvided() &&
      this.resourceGroupWasProvided() &&
      this.cacheNameWasProvided() &&
      this.skuIsSelfConsistent() &&
      this.nonSslPortIsBoolean();
  };

};

module.exports = cacheProvision;
