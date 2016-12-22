/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbBind = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var provisioningResult = JSON.parse(params.provisioning_result);
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-bind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.bind = function (sqldbOperations, next) {

        var databaseLogin, databaseLoginPassword;
        
        async.waterfall([
            function (callback) {
                log.info('sqldb cmd-bind: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-bind: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        sqldbOperations.setParameters(accessToken, resourceGroupName, sqlServerName, sqldbName);
                        callback(null);
                    }
                });
            },
            function (callback) {
                databaseLogin = reqParams.sqldbParameters.databaseLogin;
                databaseLoginPassword = reqParams.sqldbParameters.databaseLoginPassword;
                
                var uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var lowercaseLetters = uppercaseLetters.toLowerCase();
                var numbers = '1234567890';
                
                if (_.isUndefined(databaseLogin)) {
                    databaseLogin = _.sample(uppercaseLetters + lowercaseLetters + numbers, 10).join('');
                }
                
                if (_.isUndefined(databaseLoginPassword)) {
                    var containU, containL, containN;
                    do {
                        databaseLoginPassword = _.sample(uppercaseLetters + lowercaseLetters + numbers, 10).join('');
                        containU = containL = containN = false;
                        for (var i = 0; i < 10; i++) {
                            var c = databaseLoginPassword[i];
                            containU = containU || (uppercaseLetters.indexOf(c) != -1);
                            containL = containL || (lowercaseLetters.indexOf(c) != -1);
                            containN = containN || (numbers.indexOf(c) != -1);
                        }
                    } while (!(containU && containL && containN));
                }
                
                sqldbOperations.createDatabaseLogin(
                     provisioningResult.fullyQualifiedDomainName,
                     reqParams.sqlServerParameters.properties.administratorLogin,
                     reqParams.sqlServerParameters.properties.administratorLoginPassword,
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
                     reqParams.sqlServerParameters.properties.administratorLogin,
                     reqParams.sqlServerParameters.properties.administratorLoginPassword,
                     databaseLogin,
                     true,
                     function(err) {
                         if (err) {
                             log.error('sqldb cmd-bind: async.waterfall/createUserForDatabaseLogin: err: %j', err);
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
