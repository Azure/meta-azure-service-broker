/* jshint camelcase: false */
/* jshint newcap: false */

var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var docDbDeprovision = function(params) {

  var provisioningResult = params.provisioning_result || {};
  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var docDbAccountName = provisioningResult.docDbAccountName || '';
  
  this.deprovision = function(docDb, next) {
    docDb.deleteDocDbAccount(resourceGroupName, docDbAccountName, function(err, result) {
      log.debug('DocumentDb/cmd-deprovision/result: %j', result);
      if (err) {
        log.error('DocumentDb/cmd-deprovision/err: %j', err);
      }
      next(err, provisioningResult);
    });
  };  
};


module.exports = docDbDeprovision;

