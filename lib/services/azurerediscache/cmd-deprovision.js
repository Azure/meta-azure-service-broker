/* jshint camelcase: false */
/* jshint newcap: false */

var cacheDeprovision = function(params) {

    var provisioningResult = params.provisioning_result || {};
    var resourceGroupName = provisioningResult.resourceGroupName || '';
    var cacheName = provisioningResult.name || '';
    
    this.deprovision = function(redis, next) {
        redis.deprovision(resourceGroupName, cacheName, function(err) {
            next(err, provisioningResult);
        });
    };
       
};


module.exports = cacheDeprovision;