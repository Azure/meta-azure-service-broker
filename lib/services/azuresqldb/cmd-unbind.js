/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbUnbind = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var provisioningResult = JSON.parse(params.provisioning_result);
    var bindingResult = JSON.parse(params.binding_result);
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-unbind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.unbind = function (sqldbOperations, next) {
        
        async.waterfall([
            function (callback) {
                log.info('sqldb cmd-unbind: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-unbind: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        sqldbOperations.setParameters(accessToken, resourceGroupName, sqlServerName, sqldbName);
                        callback(null);
                    }
                });
            },
            function (callback) {
                log.info('sqldb cmd-unbind: async.waterfall/dropUserOfDatabaseLogin');
                sqldbOperations.dropUserOfDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    bindingResult.databaseLogin,
                    false,
                    function(err) {
                        if (err) {
                            log.error('sqldb cmd-unbind: dropUserOfDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                );
            },
            function (callback) {
                log.info('sqldb cmd-unbind: async.waterfall/dropDatabaseLogin');
                sqldbOperations.dropDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    bindingResult.databaseLogin,
                    true,
                    function(err) {
                        if (err) {
                            log.error('sqldb cmd-unbind: dropDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                );
            }
        ], function (err) {
            log.info('sqldb cmd-unbind: async.waterfall/final callback: err: ', err);
            next(err);
        });
                
    };
};

module.exports = sqldbUnbind;
