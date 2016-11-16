/* jshint camelcase: false */
/* jshint newcap: false */

var cacheBind = function(log, params) {
  var reqParams = params.parameters || {};
  var resourceGroup = reqParams.resourceGroup || '';
  var cacheName = reqParams.cacheName || '';

  this.bind = function(redis, callback) {
    redis.bind(resourceGroup, cacheName, function(err, accessKeys) {
      if (err) {
        callback(err);
      } else {
        callback(null, accessKeys);
      }
    });
  };
};

module.exports = cacheBind;
