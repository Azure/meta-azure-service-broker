/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var util = require('util');
var resourceGroup = require('../../common/resourceGroup-client');

var postgresqldbProvision = function (params) {

    var reqParams = params.parameters || {};
    var postgresqlServerName = reqParams.postgresqlServerName || '';

    var resourceGroupName = reqParams.resourceGroup || '';
    var location = reqParams.location || '';

    var administratorLogin = null, administratorLoginPassword = null;
    if (reqParams.postgresqlServerParameters) {
        var properties = reqParams.postgresqlServerParameters.properties;
        if (properties) {
            administratorLogin = properties.administratorLogin;
            administratorLoginPassword = properties.administratorLoginPassword;
        }
    }

    log.info(util.format('cmd-provision: resourceGroupName: %s, postgresqlServerName: %s', resourceGroupName, postgresqlServerName));

    var planId = params.plan_id;
    Config.plans.forEach(function (item) {
        if (planId === item.id) {
            reqParams.sku = {};
            reqParams.sku.family = 'Gen5';
            var tier_short = {
                'Basic': 'B',
                'GeneralPurpose': 'GP',
                'MemoryOptimized': 'MO'
            }[item.metadata.details.tier];
            reqParams.sku.name = util.format('%s_Gen5_%s', tier_short, item.metadata.details.capacity);
            reqParams.sku.tier = item.metadata.details.tier;
            reqParams.sku.capacity = item.metadata.details.capacity;
        }
    });

    this.provision = function (postgresqldbOperations, next) {

        var groupParameters = {
            location: location
        };
        reqParams.location = location;

        postgresqldbOperations.setParameters(resourceGroupName, postgresqlServerName, location);

        async.waterfall([
            function (callback) {  // get postgresql server status (existence check)
                postgresqldbOperations.getServer(function (err, result) {
                    if (err) {
                        log.error('cmd-provision: get the postgresql server: err: %j', err);
                        return callback(err);
                    }
                    log.info('cmd-provision: get the postgresql server: %j', result);
                    if (result.statusCode === HttpStatus.NOT_FOUND) {
                        callback(null);
                    } else if (result.statusCode === HttpStatus.OK) {  // postgresql server exists
                        var error = Error('The server name is not available.');
                        error.statusCode = HttpStatus.CONFLICT;
                        callback(error);
                    } else {
                        var errorMessage = util.format('Unexpected result: %j', result);
                        log.error(errorMessage);
                        callback(Error(errorMessage));
                    }
                });
            },
            function(callback) {
                resourceGroup.checkExistence(Config.name, params.azure, resourceGroupName, callback);
            },
            function(existed, callback) {
                if (existed) {
                    callback(null);
                } else {
                    resourceGroup.createOrUpdate(Config.name, params.azure, resourceGroupName, groupParameters, callback);
                }
            },
            function (callback) {   // create postgresql server if not exist
                postgresqldbOperations.createServer(reqParams, function (err, serverPollingUrl) {
                    if (err) {
                        log.error('cmd-provision: create the postgresql server: err: %j', err);
                        callback(err);
                    } else {
                        log.info('cmd-provision: create the postgresql server: succeeded');
                        var result = {};
                        result.body = {};
                        result.body.resourceGroup = resourceGroupName;
                        result.body.postgresqlServerName = postgresqlServerName;
                        result.body.administratorLogin = administratorLogin;
                        result.body.administratorLoginPassword = administratorLoginPassword;
                        result.body.serverPollingUrl = serverPollingUrl;
                        result.body.postgresqlDatabaseName = reqParams.postgresqlDatabaseName;

                        result.value = {};
                        result.value.state = 'in progress';
                        result.value.description = 'Creating server ' + reqParams.postgresqlServerName + '.';
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
            if (err) {
                log.error('cmd-provision: final callback: err: ', err);
            } else {
                log.info('cmd-provision: final callback: result: ', result);
            }
            next(err, result);
        });
    };

    // validators

    this.firewallRuleIsOk = function () {
        if (!_.isUndefined(reqParams.postgresqlServerParameters) && !_.isUndefined(reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules)) {
            var rules = reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules;
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

        var names = ['resourceGroupName', 'location', 'postgresqlServerName', 'administratorLogin', 'administratorLoginPassword', 'postgresqlDatabaseName'];
        var values = [resourceGroupName, location, postgresqlServerName, administratorLogin, administratorLoginPassword, reqParams.postgresqlDatabaseName];
        for (var i = 0; i < names.length; i++) {
            if (!_.isString(values[i]) || values[i].length === 0) {
                ret.push(names[i]);
            }
        }
        return ret;
    };

    this.getInvalidParams = function () {
        var invalidParams = [];
        invalidParams = invalidParams.concat(this.parametersNotProvided());

        if (!this.firewallRuleIsOk()) invalidParams.push('allowPostgresqlServerFirewallRules');
        return invalidParams;
    };
};

module.exports = postgresqldbProvision;
