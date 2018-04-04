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
  var location = reqParams.location;
  
  var planId = params.plan_id;
  Config.plans.forEach(function (item) {
    if (planId === item.id) {
      params.parameters.sku = {
        name: item.metadata.details.name,
        family: item.metadata.details.family,
        capacity: item.metadata.details.capacity
      };
    }
  });

  this.provision = function(redis, next) {
      
    var groupParameters = {
        location: location
    };

    async.waterfall([
      function(callback) {
          resourceGroup.checkExistence(Config.name, params.azure, resourceGroupName, callback);
      },
      function(existed, callback) {
          if (existed) {
              callback(null);
          } else {
              resourceGroup.createOrUpdate(Config.name, params.azure, resourceGroupName, groupParameters, callback);
          }
      },
      function(callback) {
        log.debug('Redis Cache, redis.provision, resourceGroupName: %s, cacheName: %s', resourceGroupName, cacheName);
        var redisParams = reqParams.parameters;
        redisParams.tags = common.mergeTags(redisParams.tags);
        redisParams.location = location;
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
      this.nonSslPortIsBoolean();
  };

};

module.exports = cacheProvision;
