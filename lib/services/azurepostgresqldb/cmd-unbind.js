/* jshint camelcase: false */

'use strict';

var async = require('async');
var common = require('../../common');
var Config = require('./service');
var log = common.getLogger(Config.name);

var postgresqldbUnbind = function (params) {
    var provisioningResult = params.provisioning_result || {};
    var bindingResult = params.binding_result || {};

    this.unbind = function (postgresqldbOperations, next) {
        async.waterfall([
            function (callback) {
                // Revoke privileges from user
                postgresqldbOperations.revokeDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.postgresqlServerName,
                    provisioningResult.postgresqlDatabaseName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    bindingResult.databaseLogin,
                    true,
                    function (err) {
                        if (err) {
                            log.error('postgresqldb cmd-unbind: async.waterfall/revokeDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                );
            }, function (callback) {
                // Drop user
                postgresqldbOperations.dropDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.postgresqlServerName,
                    provisioningResult.postgresqlDatabaseName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
                    bindingResult.databaseLogin,
                    true,
                    function (err) {
                        if (err) {
                            log.error('postgresqldb cmd-unbind: async.waterfall/dropDatabaseLogin: err: %j', err);
                        }
                        callback(err);
                    }
                );
            }
        ], function (err, res) {
            if (err) {
                log.error('postgresqldb cmd-unbind: final callback: err: ', err);
            } else {
                log.info('postgresqldb cmd-unbind: final callback: result: %j', res);
            }
            var result = {
                value: {},
                body: {}
            };
            next(err, result);
        });

    };
};

module.exports = postgresqldbUnbind;
