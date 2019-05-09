/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbBind = function (params) {

    var reqParams = params.parameters || {};
    var accountPool = params.accountPool.sqldb || {};

    var provisioningResult = params.provisioning_result || {};
    var sqlServerName = reqParams.sqlServerName || '';
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';

    log.info(util.format('sqldb cmd-bind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.bind = function (sqldbOperations, next) {
        if (reqParams.userProvidedDatabaseLogin) {
            // assume the login/password provided by user always work
            return next(null, {
                databaseLogin: reqParams.userProvidedDatabaseLogin,
                databaseLoginPassword: reqParams.userProvidedDatabaseLoginPassword
            });
        }
        var administratorLogin, administratorLoginPassword;
        if (sqlServerName in accountPool) {
            administratorLogin = accountPool[sqlServerName]['administratorLogin'];
            administratorLoginPassword = accountPool[sqlServerName]['administratorLoginPassword'];
        } else {
            var errorMessage = util.format('Can\'t find the server name %s in sqlServerPool.', sqlServerName);
            next(Error(errorMessage));
        }
        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        var databaseLogin, databaseLoginPassword;
        async.waterfall([
            function (callback) {
                databaseLogin = common.generateName();
                databaseLoginPassword = common.generateStrongPassword();

                // create the login
                sqldbOperations.createDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    administratorLogin,
                    administratorLoginPassword,
                    databaseLogin,
                    databaseLoginPassword,
                    false,
                    function(err) {
                        if (err) {
                            log.error('sqldb cmd-bind: async.waterfall/createDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                 );
            },
            function (callback) {
                sqldbOperations.createUserForDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    administratorLogin,
                    administratorLoginPassword,
                    databaseLogin,
                    false,
                    function(err) {
                        if (err) {
                            log.error('sqldb cmd-bind: async.waterfall/createUserForDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                );
            },
            function (callback) {
                sqldbOperations.grantControlToUser(
                     provisioningResult.fullyQualifiedDomainName,
                     administratorLogin,
                     administratorLoginPassword,
                     databaseLogin,
                     true,
                     function(err) {
                         if (err) {
                             log.error('sqldb cmd-bind: async.waterfall/grantControlToUser: err: %j', err);
                         }
                         callback(err);
                     }
                 );
            }
        ], function (err) {
            next(err, {databaseLogin: databaseLogin, databaseLoginPassword: databaseLoginPassword});
        });
    };
};

module.exports = sqldbBind;
