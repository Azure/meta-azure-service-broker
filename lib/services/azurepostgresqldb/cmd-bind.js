/* jshint camelcase: false */

'use strict';

var async = require('async');
var common = require('../../common');
var Config = require('./service');
var log = common.getLogger(Config.name);

var postgresqldbBind = function (params) {
    var provisioningResult = params.provisioning_result;

    this.bind = function (postgresqldbOperations, next) {
        var databaseLogin, databaseLoginPassword;
        async.waterfall([
            function (callback) {
                // Generate the login/password
                databaseLogin = common.generateName();
                databaseLoginPassword = common.generateStrongPassword();
                // Create the login
                postgresqldbOperations.createDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.postgresqlServerName,
                    provisioningResult.postgresqlDatabaseName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    databaseLogin,
                    databaseLoginPassword,
                    false,
                    function(err) {
                        if (err) {
                            log.error('postgresqldb cmd-bind: async.waterfall/createDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                 );
            },
            function (callback) {
                // Grant control
                postgresqldbOperations.grantControlToUser(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.postgresqlServerName,
                    provisioningResult.postgresqlDatabaseName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    databaseLogin,
                    true,
                    function(err) {
                        if (err) {
                            log.error('postgresqldb cmd-bind: async.waterfall/grantControlToUser: err: %j', err);
                        }
                        callback(err);
                    }
                );
            },
            function (callback) {
                var result = {
                    databaseLogin: databaseLogin,
                    databaseLoginPassword: databaseLoginPassword
                };
                callback(null, result);
            }
        ], function (err, result) {
            if (err) {
                log.error('postgresqldb cmd-bind: final callback: err: ', err);
            } else {
                log.info('postgresqldb cmd-bind: final callback: result: %j', result);
            }
            next(err, result);
        });
    };
};

module.exports = postgresqldbBind;
