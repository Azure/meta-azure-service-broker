/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');

var docDbBind = function(log, params) {
  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var docDbAccountName = provisioningResult.docDbAccountName;
  
  this.bind = function(docDb, callback) {
    async.waterfall([
      function(callback) {
        docDb.getToken(function(err, accessToken) {
          callback(err, accessToken);
        });
      },
      function(accessToken, callback) {
        docDb.getAccountKey(resourceGroupName, docDbAccountName, accessToken, function(err, masterKey) {
          callback(err, masterKey);
        });
      }
    ], function(err, masterKey) {
      if (err) {
        callback(err);
      } else {
        callback(null, masterKey);
      }
    });
  };
};

module.exports = docDbBind;
