/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbUnbind = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result || {};
    var bindingResult = params.binding_result || {};
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-unbind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.unbind = function (sqldbOperations, next) {
        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        
        async.waterfall([
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
