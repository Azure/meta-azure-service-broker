/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var docDbBind = function(log, params) {

  var instanceId = params.instance_id;
  var provisioningResult = JSON.parse(params.provisioning_result);
  var lastoperation = params.last_operation || '';

  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var docDbAccountName = provisioningResult.docDbAccountName || '';
  
  this.bind = function(docDb, next) {

    docDb.bind(resourceGroupName, docDbAccountName, function(err, result) {
      log.debug('DocumentDb, docDb.bind, err: %j\n, result: %j', err, result);
      if (err) {
        log.error('DocDb, docDb.bind, err: %j', err);
        next(err);
      } else {
        next(null, result);
      }
    });
  };
};

module.exports = docDbBind;
