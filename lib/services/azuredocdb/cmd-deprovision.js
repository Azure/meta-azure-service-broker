/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');

var docDbDeprovision = function(log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var docDbLink = provisioningResult._self;
    
    this.deprovision = function(docDb, next) {
        docDb.deprovision(docDbLink, function(err, result) {
            log.debug('DocumentDb/cmd-deprovision/result: %j', result);
            if (err) {
                log.error('DocumentDb/cmd-deprovision/err: %j', err);
            }
            next(err, result);
        });
    };

//  Validators

    this.docDbLinkWasProvided = function() {
        if (_.isString(docDbLink)) {
            if (docDbLink.length !== 0) return true;            
        }

        log.error('docDb De-provision: Db link was not provided.');
        return false;
    };
    
    this.allValidatorsSucceed = function() {
        return this.docDbLinkWasProvided();
    };
       
};


module.exports = docDbDeprovision;
