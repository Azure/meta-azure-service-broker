/* jshint camelcase: false */
/* jshint newcap: false */

var docDbDeprovision = function(log, params) {

  var provisioningResult = JSON.parse(params.provisioning_result);
  
  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var docDbAccountName = provisioningResult.docDbAccountName || '';
  
  this.deprovision = function(docDb, next) {
    docDb.deleteDocDbAccount(resourceGroupName, docDbAccountName, function(err, result) {
      log.debug('DocumentDb/cmd-deprovision/result: %j', result);
      if (err) {
        log.error('DocumentDb/cmd-deprovision/err: %j', err);
      }
      next(err, result);
    });
  };  
};


module.exports = docDbDeprovision;

