/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbBind = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result || {};
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-bind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.bind = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        
        var databaseLogin, databaseLoginPassword;
        
        async.waterfall([
            function (callback) {
                
                // generate database login
                var uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var lowercaseLetters = uppercaseLetters.toLowerCase();
                var numbers = '1234567890';
                
                databaseLogin = _.sample(uppercaseLetters + lowercaseLetters + numbers, 10).join('');
                
                // generate database login password
                var passwordLength = 10;
                
                function getRandomInt (min, max) {
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                }

                Array.prototype.shuffle = function() {
                    for (var i = this.length - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * (i + 1));
                        var temp = this[i];
                        this[i] = this[j];
                        this[j] = temp;
                    }
                    return this;
                };
                
                databaseLoginPassword = '';
                
                var upperLength = getRandomInt(1, passwordLength-2);
                databaseLoginPassword += _.sample(uppercaseLetters, upperLength).join('');
                
                var lowerLength = getRandomInt(1, passwordLength-upperLength-1);
                databaseLoginPassword +=  _.sample(lowercaseLetters, lowerLength).join('');
                
                var numLength = passwordLength - upperLength - lowerLength;
                databaseLoginPassword +=  _.sample(numbers, numLength).join('');
                
                databaseLoginPassword = databaseLoginPassword.split('')
                                                             .shuffle()
                                                             .join('');
                // create the login
                sqldbOperations.createDatabaseLogin(
                    provisioningResult.fullyQualifiedDomainName,
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
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
                    provisioningResult.administratorLogin,
                    provisioningResult.administratorLoginPassword,
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
                     provisioningResult.administratorLogin,
                     provisioningResult.administratorLoginPassword,
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
