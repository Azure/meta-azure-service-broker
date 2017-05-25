/* jshint camelcase: false */
/* jshint newcap: false */

var cosmosDbBind = function(params) {
  var provisioningResult = params.provisioning_result || {};
  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var cosmosDbAccountName = provisioningResult.cosmosDbAccountName || '';
  
  this.bind = function(cosmosDb, callback) {
    cosmosDb.getAccountKey(resourceGroupName, cosmosDbAccountName, function(err, masterKey, readonlyMasterKey) {
      callback(err, masterKey, readonlyMasterKey);
    });
  };
};

module.exports = cosmosDbBind;
