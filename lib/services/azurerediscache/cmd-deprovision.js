/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');

var cacheDeprovision = function(log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var idParts = provisioningResult.id.split('/');
    var resourceGroupName = idParts[4];
    var cacheName = provisioningResult.name;
    
    this.deprovision = function(redis, next) {
        redis.deprovision(resourceGroupName, cacheName, function(err, result) {
            next(err, result);
        });
    };

//  Validators

    this.resourceGroupNameWasProvided = function() {
        if (_.isString(resourceGroupName)) {
            if (resourceGroupName.length !== 0) return true;            
        }
        log.error('Redis Cache De-Provision: Resource group was not provided.');
        return false;
    };
    
    this.cacheNameWasProvided = function() {
        if (_.isString(cacheName)) {
            if (cacheName.length !== 0) return true;            
        }
        log.error('Redis Cache De-Provision: Cache name was not provided.');
        return false;
    };
    
    this.allValidatorsSucceed = function() {
        return this.resourceGroupNameWasProvided() &&
            this.cacheNameWasProvided();
    };
       
};


module.exports = cacheDeprovision;