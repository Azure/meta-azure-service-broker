/* jshint camelcase: false */
/* jshint newcap: false */

var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var cosmosDbDeprovision = function(params) {

  var provisioningResult = params.provisioning_result || {};
  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var cosmosDbAccountName = provisioningResult.cosmosDbAccountName || '';
  
  this.deprovision = function(cosmosDb, next) {
    cosmosDb.deleteCosmosDbAccount(resourceGroupName, cosmosDbAccountName, function(err, result) {
      log.debug('CosmosDb/cmd-deprovision/result: %j', result);
      if (err) {
        log.error('CosmosDb/cmd-deprovision/err: %j', err);
      }
      next(err, provisioningResult);
    });
  };  
};


module.exports = cosmosDbDeprovision;

