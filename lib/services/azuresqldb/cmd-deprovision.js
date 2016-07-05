/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var HttpStatus = require('http-status-codes');

var sqldbDeprovision = function (log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var idParts = provisioningResult.id.split('/');
    var resourceGroupName = idParts[4];
    var sqldbName = provisioningResult.name;    
    var sqlServerName = provisioningResult.sqlServerName;

    log.debug('sqldb cmd-poll: resourceGroupName: {0}, sqldbName: {1}, sqlServerName: {2}'.format(resourceGroupName, sqldbName, sqlServerName));

    this.deprovision = function (sqldbOperations, next) {

        async.waterfall([
            function (callback) {
                log.debug('sqldb cmd-deprovision: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-deprovision: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        sqldbOperations.setParameters(accessToken, resourceGroupName, sqlServerName, sqldbName);
                        callback(null);
                    }
                });
            }, 
            function (callback) {
                sqldbOperations.deleteDatabase(function (err, result) {
                    if (err) {
                        log.error('sqldb cmd-deprovision: async.waterfall/deleteDatabase: err: %j', err);
                        return callback(err);
                    } else {
                        result.value = {};
                        result.value.state = 'succeeded';
                        result.value.description = 'Deleted database';
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
            log.debug('sqldb cmd-deprovision: async.waterfall/final callback: result: ', result);
            next(err, result);
        });
    };
};

module.exports = sqldbDeprovision;
