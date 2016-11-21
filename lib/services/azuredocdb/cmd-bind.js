/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');

var docDbBind = function(log, params) {
  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var docDbAccountName = provisioningResult.docDbAccountName;
  
  this.bind = function(docDb, callback) {
    async.waterfall([
      function(cb) {
        docDb.getToken(function(err, accessToken) {
          cb(err, accessToken);
        });
      },
      function(accessToken, cb) {
        docDb.getAccountKey(resourceGroupName, docDbAccountName, accessToken, function(err, masterKey) {
          cb(err, masterKey);
        });
      }
    ], callback);
  };
};

module.exports = docDbBind;
