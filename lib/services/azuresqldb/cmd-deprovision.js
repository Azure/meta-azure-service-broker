/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbDeprovision = function (log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var idParts = provisioningResult.id.split('/');
    var resourceGroupName = idParts[4];
    var sqldbName = provisioningResult.name;    
    var sqlServerName = provisioningResult.sqlServerName;

    log.info(util.format('sqldb cmd-deprovision: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.deprovision = function (sqldbOperations, next) {

        async.waterfall([
            function (callback) {
                log.info('sqldb cmd-deprovision: async.waterfall/getToken');
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
                sqldbOperations.deleteServer(function (err) {
                    if (err) {
                        log.error('sqldb cmd-deprovision: async.waterfall/deleteServer: err: %j', err);
                        return callback(err);
                    } else {
                        var result = {};
                        result.state = 'succeeded';
                        result.description = 'Deleted Server';
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
            log.info('sqldb cmd-deprovision: async.waterfall/final callback: result: ', result);
            next(err, result);
        });
    };
};

module.exports = sqldbDeprovision;
