/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var mysqldbPoll = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result; 
    var lastoperation = params.last_operation || '';
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var mysqlServerName = provisioningResult.mysqlServerName || '';
    var mysqlDatabaseName = provisioningResult.mysqlDatabaseName || '';
    
    log.info(util.format('cmd-poll: resourceGroupName: %s, mysqlServerName: %s, mysqlDatabaseName: %s', resourceGroupName, mysqlServerName, mysqlDatabaseName));

    this.poll = function (mysqldbOperations, next) {

        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName, mysqlDatabaseName);
        
        var reply = {
            state: '',
            description: ''
        };
        
        var pollingResult = {};
        pollingResult.body = provisioningResult;
        pollingResult.value = reply;

        var firewallRules = null;

        if (!_.isUndefined(reqParams.mysqlServerParameters)) {
            if (!_.isUndefined(reqParams.mysqlServerParameters.allowMysqlServerFirewallRules)) {
                firewallRules = reqParams.mysqlServerParameters.allowMysqlServerFirewallRules;
            }
        }
            
        function getServerProperties(callback) {
            // get properties of server
            log.info('cmd-poll: get server');
            mysqldbOperations.getServer(function (err, result) {
                if (err) {
                    log.error('cmd-poll: get server: err: %j', err);
                    callback(err);
                } else {
                    if (result.statusCode !== HttpStatus.OK) {
                        var errorMessage = util.format('Unexpected result: %j', result);
                        log.error('cmd-poll: get server: err: ', errorMessage);
                        return callback(Error(errorMessage));
                    }
                        
                    log.info('cmd-poll: get server: result: %j', result);
                    provisioningResult.fullyQualifiedDomainName = result.body.properties.fullyQualifiedDomainName;
                    delete provisioningResult.serverPollingUrl;
                    callback(null);
                }
            });
        }
            
        function configureFirewallRules(callback) {
            if (firewallRules === null) {
                callback(null);
            }
            
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
                    log.info('cmd-poll: create the server-level firewall rules, index: %s, rule name: %s, start IP address: %s, end IP address: %s', i, firewallRuleName, firewallRuleStartIp, firewallRuleEndIp);
                    mysqldbOperations.createFirewallRule(firewallRuleName, firewallRuleStartIp, firewallRuleEndIp, function (err, rulePollingUrl) {
                        if (err) {
                            log.error('cmd-poll: create firewall rule %j: err: %j', firewallRules[i], err);
                            return cb(err);
                        }
                        
                        ++i;
                        provisioningResult.rulePollingUrls.push(rulePollingUrl);
                        cb(null);
                    });
                },
                function(err) {
                    callback(err);
                }
            );
        }
        
        function validateFirewallRules(callback) {
            var rulePollingUrls = provisioningResult.rulePollingUrls;
            provisioningResult.rulePollingUrls = [];
            var n = rulePollingUrls.length;
            var i = 0;
            async.whilst(
                function() {
                    return i < n;
                },
                function(cb) {
                    log.info('cmd-poll: check the server-level firewall rules');
                    mysqldbOperations.checkComplete(rulePollingUrls[i], function (err, status) {
                        if (err) {
                            log.error('cmd-poll: check firewall rule, err: %j', err);
                            return cb(err);
                        }
                        
                        ++i;
                        if (status === 'InProgress') {
                            provisioningResult.rulePollingUrls.push(rulePollingUrls[i]);
                            cb(null);
                        } else if (status === 'Succeeded') {
                            cb(null);
                        } else{
                            var message = util.format('check firewall rule, unexpected status: %s',  status);
                            log.error('cmd-poll:  %s', message);
                            return cb(Error(message));
                        }
                    });
                },
                function(err) {
                    callback(err);
                }
            );
        }
        
        log.info('cmd-poll: lastoperation: %s', lastoperation);
        if (lastoperation === 'provision') {
            if (provisioningResult.serverPollingUrl) {
                // check the status of server
                mysqldbOperations.checkComplete(provisioningResult.serverPollingUrl, function(err, status){
                    if (err) {
                        return next(err);
                    }
                     
                    if (status === 'Succeeded') {
                        async.series([
                            function (callback) {
                                getServerProperties(callback);
                            },
                            function (callback) {
                                provisioningResult.rulePollingUrls = [];
                                configureFirewallRules(callback);
                            }
                        ], function(err) {
                            if (err) {
                                next(err);
                            } else {
                                reply.state = 'in progress';
                                reply.description = util.format('Created server %s.%s', mysqlServerName, firewallRules ? ' Creating firewall rules.' : '');
                                next(null, pollingResult);
                            }
                        });
                    } else {
                        reply.state = 'in progress';
                        reply.description = util.format('Creating server %s.', mysqlServerName);
                        next(null, pollingResult);
                    }
                });
            } else if (provisioningResult.rulePollingUrls) {
                // check the status of firewall rules
                validateFirewallRules(function(err){
                    if (err) {
                        return next(err);
                    }
                    
                    if (provisioningResult.rulePollingUrls.length === 0) {
                        delete provisioningResult.rulePollingUrls;
                        mysqldbOperations.createDatabase(function (err, databasePollingUrl){
                            if (err) {
                              return next(err);
                            }
                            
                            provisioningResult.databasePollingUrl = databasePollingUrl;
                            reply.state = 'in progress';
                            reply.description = util.format('Created server %s. Created firewall rules. Creating database %s.', mysqlServerName, mysqlDatabaseName);
                            next(null, pollingResult);
                        });
                    } else {
                        reply.state = 'in progress';
                        reply.description = util.format('Created server %s. Creating firewall rules.', mysqlServerName);
                        next(null, pollingResult);
                    }
                });
            } else {
                // check the status of database
                mysqldbOperations.checkComplete(provisioningResult.databasePollingUrl, function(err, status){
                    if (err) {
                        return next(err);
                    }
                       
                    if (status === 'Succeeded') {
                        delete provisioningResult.databasePollingUrl;
                        reply.state = 'succeeded';
                        reply.description = util.format('Created server %s.%s Created database %s.', mysqlServerName, firewallRules ? ' Created firewall rules.' : '', mysqlDatabaseName);
                    } else {
                        reply.state = 'in progress';
                        reply.description = util.format('Created server %s.%s Created database %s.', mysqlServerName, firewallRules ? ' Creating firewall rules.' : '', mysqlDatabaseName);
                    }
                    next(null, pollingResult);
                });
            }

        } else if (lastoperation === 'deprovision') {
            if (provisioningResult.serverPollingUrl) {
                mysqldbOperations.checkComplete(provisioningResult.serverPollingUrl, function(err, status){
                    if (err) {
                        return next(err);
                    }
                    
                    log.info('cmd-poll: delete server status: %s', status);
                    if (status === 'Succeeded') {
                        reply.state = 'succeeded';
                        reply.description = 'Server has been deleted.';
                    } else {
                        reply.state = 'in progress';
                        reply.description = 'Deleting the server.';
                    }
                    next(null, pollingResult);
                });
            } else {
                mysqldbOperations.getServer(function (err, result) {
                    if (err) {
                        log.error('cmd-poll: check existence of mysql server: err: %j', err);
                        next(err);
                    } else {
                        log.info('cmd-poll: check existence of mysql server: result: %j', result);
                        if (result.statusCode === HttpStatus.NOT_FOUND) {
                            reply.state = 'succeeded';
                            reply.description = 'Server has been deleted.';
                        } else {
                            reply.state = 'failed';
                            reply.description = 'Failed to delete server.';
                        }
                        next(null, pollingResult);
                    }
                });
            }
        }
    };

};

module.exports = mysqldbPoll;
