/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');

var cachePoll = function(log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};

    var resourceGroup = reqParams.resourceGroup || '';
    var cacheName = reqParams.cacheName || '';
    
    this.poll = function(redis, next) {
        
        redis.poll(resourceGroup, cacheName, function(err, result) {
            // Possible messages:
            // The Resource 'Microsoft.Cache/Redis/C0CacheW' under resource group 'redisResourceGroup' was not found.
            // A requested resource could not be found. It may already have been deleted.
            if (err) {
                if ((err.message.indexOf('was not found') > -1) || (err.message.indexOf('could not be found') > -1)) {
                    next(new Error('NotFound'), result);
                } else {
                    next(err, {});
                }                
            } else {
                next(undefined, result);
            }
        });
    };

//  Validators

    this.instanceIdWasProvided = function() {
        if (_.isString(instanceId)) {
            if (instanceId.length !== 0) return true;            
        }
        return false;
    };
    
    this.resourceGroupWasProvided = function() {
        if (_.isString(resourceGroup)) {
            if (resourceGroup.length !== 0) return true;            
        }
        return false;
    };
    
    this.cacheNameWasProvided = function() {
        if (_.isString(cacheName)) {
            if (cacheName.length !== 0) return true;            
        }
        return false;
    };
    
    this.allValidatorsSucceed = function() {
        return this.instanceIdWasProvided() &&
            this.resourceGroupWasProvided() &&
            this.cacheNameWasProvided();
    };
    
};

module.exports = cachePoll;