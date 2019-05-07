/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbUnbind = function (params) {

    var reqParams = params.parameters || {};
    var accountPool = params.accountPool.sqldb || {};
    var provisioningResult = params.provisioning_result || {};
    var bindingResult = params.binding_result || {};
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-unbind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.unbind = function (sqldbOperations, next) {
        if (reqParams.userProvidedDatabaseLogin) {
            return next(null);
        }
        var primaryAdministratorLogin, primaryAdministratorLoginPassword;
        if (sqlServerName in accountPool) {
            primaryAdministratorLogin = accountPool[sqlServerName]['administratorLogin'];
            primaryAdministratorLoginPassword = accountPool[sqlServerName]['administratorLoginPassword'];
        } else {
            var errorMessage = util.format('Can\'t find the sql server %s in sqlServerPool.', sqlServerName);
            next(Error(errorMessage));
        }
        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        async.waterfall([
            function (callback) {
                log.info('sqldb cmd-unbind: async.waterfall/dropUserOfDatabaseLogin');
                sqldbOperations.dropUserOfDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    primaryAdministratorLogin,
                    primaryAdministratorLoginPassword,
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
                    primaryAdministratorLogin,
                    primaryAdministratorLoginPassword,
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
