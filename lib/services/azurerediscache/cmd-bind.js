/* jshint camelcase: false */
/* jshint newcap: false */

var cacheBind = function(params) {
  var reqParams = params.parameters || {};
  var resourceGroup = reqParams.resourceGroup || '';
  var cacheName = reqParams.cacheName || '';

  this.bind = function(redis, callback) {
    redis.bind(resourceGroup, cacheName, callback);
  };
};

module.exports = cacheBind;
