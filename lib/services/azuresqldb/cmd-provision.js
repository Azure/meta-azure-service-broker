/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var util = require('util');
var validCollations = require('./validCollations.json');

var sqldbProvision = function (params) {

    var reqParams = params.parameters || {};
    var privilege = params.privilege.sqldb;
    var accountPool = params.accountPool.sqldb;
    
    var sqlServerName = reqParams.sqlServerName || '';
    var sqldbName = reqParams.sqldbName || '';
    
    // read resourceGroupName, location, administratorLogin, administratorLoginPassword all from module config, or all from broker config
    var resourceGroupName = reqParams.resourceGroup || '';
    var location = reqParams.location || '';
    
    var administratorLogin = null, administratorLoginPassword = null;
    if (reqParams.sqlServerParameters) {
        var properties = reqParams.sqlServerParameters.properties;
        if (properties) {
            administratorLogin = properties.administratorLogin;
            administratorLoginPassword = properties.administratorLoginPassword;
        }
    }
             
    if (!(resourceGroupName || location || administratorLogin || administratorLoginPassword)) {
        if (sqlServerName in accountPool) {
            resourceGroupName = accountPool[sqlServerName]['resourceGroup'];
            location = accountPool[sqlServerName]['location'];
            administratorLogin = accountPool[sqlServerName]['administratorLogin'];
            administratorLoginPassword = accountPool[sqlServerName]['administratorLoginPassword'];
        }
    }
        
    log.info(util.format('sqldb cmd-provision: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    var firewallRules = null;

    if (!_.isUndefined(reqParams.sqlServerParameters)) {
        if (!_.isUndefined(reqParams.sqlServerParameters.allowSqlServerFirewallRules)) {
            firewallRules = reqParams.sqlServerParameters.allowSqlServerFirewallRules;
        }
    }
    
    // this is to minimize the amount of static data 
    // that must be included in the developer's parameters file
    this.fixupParameters = function () {

        // patch up the sqlServerParameters
        if (_.isUndefined(params.parameters.sqlServerParameters)) {
            params.parameters.sqlServerParameters = {};
        }
        if (_.isUndefined(params.parameters.sqlServerParameters.properties)) {
            params.parameters.sqlServerParameters.properties = {};
        }
        params.parameters.sqlServerParameters.properties.version = '12.0';

        // figure out what plan they selected and fill in some properties
        var planId = params.plan_id;
        log.info('SqlDb/cmd-provision/fixup parameters/planid: %j', planId);
        Config.plans.forEach(function (item) {
            if (planId === item.id) {
                log.info('SqlDb/cmd-provision/fixup parameters/plan name: %j', item.name);
                params.parameters.sqldbParameters.properties.maxSizeBytes = item.metadata.details.maxSizeBytes;
                params.parameters.sqldbParameters.properties.createMode = item.metadata.details.createMode;
                params.parameters.sqldbParameters.properties.edition = item.metadata.details.edition;
                params.parameters.sqldbParameters.properties.requestedServiceObjectiveName = item.metadata.details.requestedServiceObjectiveName;
                //params.parameters.sqldbParameters.properties.requestedServiceObjectiveId = item.metadata.details.requestedServiceObjectiveId;
            }
        });

    };

    this.provision = function (sqldbOperations, next) {
        
        var groupParameters = {
            location: location
        };
        reqParams.location = location;
        
        var fullyQualifiedDomainName;
        
        function getServer(callback) {
            sqldbOperations.getServer(function (err, result) {
                if (err) {
                    log.error('sqldb cmd-provision: get the sql server: err: %j', err);
                    return callback(err);
                } else {
                    log.info('sqldb cmd-provision: get the sql server: %j', result);
                    callback(null, result);
                }
            });
        }
        
        function getDatabase(callback) {
            log.info('sqldb cmd-provision: check existence of database');
            sqldbOperations.getDatabase(function (err, result) {
               if (err) {
                   log.error('sqldb cmd-provision: check existence of sql database: err: %j', err);
                   callback(err);
               } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                   callback(null);
               } else if (result.statusCode === HttpStatus.OK) {
                   var error = Error('The database name is not available.');
                   error.statusCode = HttpStatus.CONFLICT;
                   callback(error);
               } else {
                   var errorMsg = util.format('sqldb cmd-provision: check existence of sql database, unexpected error: result: %j', result);
                   log.error(errorMsg);
                   callback(Error(errorMsg));
               }
           });
        }
        
        function createDatabase(callback) {
            log.info('sqldb cmd-provision: create the database');
            sqldbOperations.createDatabase(reqParams, function (err, result) {
                if (err) {
                    log.error('sqldb cmd-provision: create sql database: err: %j', err);
                    callback(err);
                } else {
                    log.info('sqldb cmd-provision: create sql database: result: %j', result);
                    result.body.resourceGroup = resourceGroupName;
                    result.body.sqlServerName = sqlServerName;
                    result.body.fullyQualifiedDomainName = fullyQualifiedDomainName;
                    result.body.administratorLogin = administratorLogin;
                    result.body.administratorLoginPassword = administratorLoginPassword;
                                
                    result.value = {};
                    result.value.state = 'in progress';
                    result.value.description = 'Creating logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                    callback(null, result);
                }
            });
        }

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName, location);
        
        if (!privilege.allowToCreateSqlServer) {
            async.waterfall([
                function (callback) {  // get sql server status (existence check)
                    getServer(callback);
                },
                function (result, callback) {
                    if (result.statusCode === HttpStatus.NOT_FOUND) {
                        var errorMessage = util.format('The specified server does not exist but you do not have the privilege to create a new server.');
                        callback(Error(errorMessage));
                    } else if (firewallRules !== null) {
                        var errorMessage = util.format('You specify the firewall rules for the server but you do not have the privilege to operate the server.');
                        callback(Error(errorMessage));
                    } else if (result.statusCode === HttpStatus.OK) {
                        fullyQualifiedDomainName = JSON.parse(result.body).properties.fullyQualifiedDomainName;
                        callback(null);
                    } else {
                        var errorMessage = util.format('Unexpected error: %j', result);
                        callback(Error(errorMessage));
                    }
                },
                function (callback) {   // see if db exists (in the case that sql server was there already)
                    getDatabase(callback);
                },
                function (callback) {  // create the database
                    createDatabase(callback);
                }
            ], function (err, result) {
                if (err) {
                    log.error('sqldb cmd-provision: final callback: err: ', err);
                } else {
                    log.info('sqldb cmd-provision: final callback: result: ', result);
                }
                next(err, result);
            });
        } else {
            async.waterfall([
                function (callback) {
                    sqldbOperations.createResourceGroup(resourceGroupName, groupParameters, callback);
                },
                function (callback) {  // get sql server status (existence check)
                    getServer(callback);
                },
                function (result, callback) {   // create sql server if not exist
                    if (result.statusCode === HttpStatus.NOT_FOUND) {
                        sqldbOperations.createServer(reqParams, function (err, result) {
                            if (err) {
                                log.error('sqldb cmd-provision: create the sql server: err: %j', err);
                                callback(err);
                            } else {    // sql server created, go on to create the database
                                log.info('sqldb cmd-provision: create the sql server: succeeded');
                                fullyQualifiedDomainName = result.body.properties.fullyQualifiedDomainName;
                                callback(null);
                            }
                        });
                    } else if (result.statusCode === HttpStatus.OK) {  // sql server exists
                        log.info('sqldb cmd-provision: create the sql server: ignored because the sql server already exists');
                        fullyQualifiedDomainName = JSON.parse(result.body).properties.fullyQualifiedDomainName;
                        callback(null);
                    } else {
                        var errorMessage = util.format('Unexpected error: %j', result);
                        log.error(Error(errorMessage));
                        callback(Error(errorMessage));
                    }
                },
                function (callback) {  // open firewall IP if requested
                    if (firewallRules !== null) {
                        
                        var n = firewallRules.length;
                        var i = 0;
                        async.whilst(
                            function() {
                                return i < n;
                            },
                            function(cb) {
                                var firewallRuleName = firewallRules[i]['ruleName'];
                                var firewallRuleStartIp = firewallRules[i]['startIpAddress'];
                                var firewallRuleEndIp = firewallRules[i]['endIpAddress'];
                                log.info('sqldb cmd-provision: create the server-level firewall rules, index: %s, rule name: %s, start IP address: %s, end IP address: %s', i, firewallRuleName, firewallRuleStartIp, firewallRuleEndIp);
                                sqldbOperations.createFirewallRule(firewallRuleName, firewallRuleStartIp, firewallRuleEndIp, function (err, result) {
                                    if (err) {
                                        log.error('sqldb cmd-provision: create firewall rule: err: %j', err);
                                        return cb(err);
                                    } else if ((result.statusCode === HttpStatus.OK) || (result.statusCode === HttpStatus.CREATED)) {
                                        log.info('sqldb cmd-provision: create firewall rule: rule created');
                                        ++i;
                                        cb(null);
                                    } else {
                                        log.error('sqldb cmd-provision: create firewall rule, unexpected error: result: %j', result);
                                        return cb(Error(result.body.message));
                                    }
                                });
                            },
                            function(err) {
                                callback(err);
                            }
                        );
                    } else {
                        callback(null);
                    }
                },
                function (callback) {   // see if db exists (in the case that sql server was there already)
                    getDatabase(callback);
                },
                function (callback) {  // create the database
                    createDatabase(callback);
                }
            ], function (err, result) {
                if (err) {
                    log.info('sqldb cmd-provision: final callback: err: ', err);
                } else {
                    log.info('sqldb cmd-provision: final callback: result: ', result);
                }
                next(err, result);
            });
        }
    };

    // validators

    this.firewallRuleIsOk = function () {
        if (!_.isUndefined(reqParams.sqlServerParameters) && !_.isUndefined(reqParams.sqlServerParameters.allowSqlServerFirewallRules)) {
            var rules = reqParams.sqlServerParameters.allowSqlServerFirewallRules;
            if (!(rules instanceof Array)) return false;
            var ruleValidFlag = true;
            rules.forEach(function (rule){
                if (rule.ruleName) {
                    if (rule.ruleName.length === 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
                if (_.isString(rule.startIpAddress)) {
                    if (rule.startIpAddress.length === 0) {ruleValidFlag = false; return;}
                    if (rule.startIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
                if (_.isString(rule.endIpAddress)) {
                    if (rule.endIpAddress.length === 0) {ruleValidFlag = false; return;}
                    if (rule.endIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
            });
            return ruleValidFlag;
        }
        return true;    // no firewall rule at all, is ok.
    };
    
    this.parametersNotProvided = function () {
        var ret = [];
      
        // "eval" can be harmful.
        var names = ['resourceGroupName', 'location', 'sqlServerName', 'sqldbName', 'administratorLogin', 'administratorLoginPassword'];
        var values = [resourceGroupName, location, sqlServerName, sqldbName, administratorLogin, administratorLoginPassword];
        for (var i = 0; i < names.length; i++) {
            if (!_.isString(values[i]) || values[i].length === 0) {
                ret.push(names[i]);
            }
        }

        return ret;
    };

    this.sqlDbCollationWasProvided = function () {
        if (reqParams.sqldbParameters &&
            reqParams.sqldbParameters.properties &&
            _.isString(reqParams.sqldbParameters.properties.collation)) {
            var collation = reqParams.sqldbParameters.properties.collation;
            if (_.indexOf(validCollations, collation) != -1) return true;
        }
        log.error('SqlDb Provision: SQL DB collation was not provided.');
        return false;
    };
    
    this.noDeprecatedParametersWereProvided = function () {
        if (!_.isUndefined(reqParams.sqlServerCreateIfNotExist)) {
            log.error('SqlDb Provision: The parameter sqlServerCreateIfNotExist is deprecated. Please remove it from your parameters, and try again');
            return false;
        }
        return true;
    };

    this.getInvalidParams = function () {
        var invalidParams = [];
        invalidParams = invalidParams.concat(this.parametersNotProvided());
        
        if (!this.sqlDbCollationWasProvided()) invalidParams.push('collation');
        if (!this.firewallRuleIsOk()) invalidParams.push('allowSqlServerFirewallRules');
        if (!this.noDeprecatedParametersWereProvided()) invalidParams.push('sqlServerCreateIfNotExist');
        return invalidParams;
    };
};

module.exports = sqldbProvision;

