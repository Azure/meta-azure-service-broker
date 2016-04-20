/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');

var docDbPoll = function(log, params) {

    log.muteOnly('debug');

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';

    var docDbName = reqParams.docDbName || '';

    this.poll = function(docDb, next) {

        docDb.poll(docDbName, function(err, result) {
            log.debug('DocumentDb, docDb.poll, err: %j', err);
            log.debug('DocumentDb, docDb.poll, result: %j', result);
            
            // this code is bogus - but needed because of a strange thing that happened during testing
            if (_.isNull(result) && lastoperation === 'provision') {
                // something weird happened - observed this once but no logs.
                log.error('DocumentDb, docDb.poll, bogus scenario happened again.');
                lastoperation = 'deprovision';
            } 
            
            var reply = {
                state: '',
                description: '',
            };
            if (lastoperation === 'provision') {
                if (!err) {
                    reply.state = 'succeeded';
                    reply.description = 'Created the document db, resource Id: ' + result._self;
                } else {
                    next(err);
                }
            } else if (lastoperation === 'deprovision') {
                if (!err) {
                    reply.state = 'succeeded';
                    reply.description = 'Deleted the document db.';
                } else {
                    next(err);
                }
            }
            reply = {
                statusCode: 200,
                code: 'OK',
                value: reply,
            };
            next(null, reply);
        });
    };

    //  Validators

    this.instanceIdWasProvided = function() {
        if (_.isString(instanceId)) {
            if (instanceId.length !== 0) return true;
        }

        log.error('docDb Poll: Instance Id was not provided.');
        return false;
    };

    this.docDbNameWasProvided = function() {
        if (_.isString(docDbName)) {
            if (docDbName.length !== 0) return true;
        }

        log.error('docDb Poll: docDb name was not provided.');
        return false;
    };

    this.allValidatorsSucceed = function() {
        return this.instanceIdWasProvided() &&
            this.docDbNameWasProvided();
    };

};

module.exports = docDbPoll;
