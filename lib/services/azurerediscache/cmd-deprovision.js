/* jshint camelcase: false */
/* jshint newcap: false */

var cacheDeprovision = function(log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var resourceGroupName = provisioningResult.resourceGroupName;
    var cacheName = provisioningResult.name;
    
    this.deprovision = function(redis, next) {
        redis.deprovision(resourceGroupName, cacheName, next);
    };
       
};


module.exports = cacheDeprovision;