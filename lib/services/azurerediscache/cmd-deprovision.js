/* jshint camelcase: false */
/* jshint newcap: false */

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
       
};


module.exports = cacheDeprovision;