/* jshint camelcase: false */
/* jshint newcap: false */

var Config = require('./service');
<<<<<<< HEAD
var common = require('../../common');
var log = common.getLogger(Config.name);
=======
var log = require('winston').loggers.get(Config.name);
>>>>>>> 2d516c4aea40dfb009515bcaa5447c21ad0c0320

var docDbDeprovision = function(params) {

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

