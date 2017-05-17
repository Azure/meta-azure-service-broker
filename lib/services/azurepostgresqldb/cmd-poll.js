/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var postgresqldbPoll = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result; 
    var lastoperation = params.last_operation || '';
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var postgresqlServerName = provisioningResult.postgresqlServerName || '';
    var serverPollingUrl = provisioningResult.serverPollingUrl || '';
    
    log.info(util.format('cmd-poll: resourceGroupName: %s, postgresqlServerName: %s', resourceGroupName, postgresqlServerName));

    this.poll = function (postgresqldbOperations, next) {

        postgresqldbOperations.setParameters(resourceGroupName, postgresqlServerName);
        
        var reply = {
            state: '',
            description: ''
        };
        
        var pollingResult = {};
        pollingResult.body = provisioningResult;
        pollingResult.value = reply;

        var firewallRules = null;

        if (!_.isUndefined(reqParams.postgresqlServerParameters)) {
            if (!_.isUndefined(reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules)) {
                firewallRules = reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules;
            }
        }
            
        function getServerProperties(callback) {
            // get properties of server
            log.info('cmd-poll: get server');
            postgresqldbOperations.getServer(function (err, result) {
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
                    if (firewallRules !== null) {
                        reply.state = 'in progress';
                        reply.description = 'Created server ' + postgresqlServerName + '. Creating firewall rules.';
                    } else {
                        reply.state = 'succeeded';
                        reply.description = 'Created server ' + postgresqlServerName + '.';
                    }
                    callback(null);
                }
            });
        }
            
        function configureFirewallRules(callback) {
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
                    postgresqldbOperations.createFirewallRule(firewallRuleName, firewallRuleStartIp, firewallRuleEndIp, function (err, res) {
                        if (err) {
                            log.error('cmd-poll: create firewall rule %j: err: %j', firewallRules[i], err);
                            return cb(err);
                        }
                        if (res.statusCode === HttpStatus.ACCEPTED) {
                            log.info('cmd-poll: create firewall rule %j: rule creating', firewallRules[i]);
                            ++i;
                            provisioningResult.ruleStatusUrls.push(res['headers']['azure-asyncoperation']);
                            cb(null);
                        } else{
                            log.error('cmd-poll: create firewall rule %j, unexpected res: res: %j', firewallRules[i], res);
                            return cb(Error(res.body.message));
                        }
                    });
                },
                function(err) {
                    callback(err);
                }
            );
        }
        
        function validateFirewallRules(callback) {
            var ruleStatusUrls = provisioningResult.ruleStatusUrls;
            provisioningResult.ruleStatusUrls = [];
            var n = ruleStatusUrls.length;
            var i = 0;
            async.whilst(
                function() {
                    return i < n;
                },
                function(cb) {
                    log.info('cmd-poll: check the server-level firewall rules');
                    postgresqldbOperations.checkComplete(ruleStatusUrls[i], function (err, status) {
                        if (err) {
                            log.error('cmd-poll: check firewall rule, err: %j', err);
                            return cb(err);
                        }
                        
                        ++i;
                        if (status === 'InProgress') {
                            provisioningResult.ruleStatusUrls.push(ruleStatusUrls[i]);
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
            
            if (serverPollingUrl) { // server is created if not exist, to check firewall rule status
                // check status of creating server
                postgresqldbOperations.checkComplete(serverPollingUrl, function(err, status){
                    if (err) {
                        return next(err);
                    }
                     
                    if (status === 'Succeeded') {
                        async.series([
                            function (callback) {
                                getServerProperties(callback);
                            },
                            function (callback) {
                                if (firewallRules !== null) {
                                    provisioningResult.ruleStatusUrls = [];
                                    configureFirewallRules(callback);
                                } else {
                                    callback(null);
                                }
                            }
                        ], function(err) {
                            if (err) {
                                next(err);
                            } else {
                                next(null, pollingResult);
                            }
                        });
                    } else {
                        reply.state = 'in progress';
                        reply.description = 'Creating server ' + postgresqlServerName + '.';
                        next(null, pollingResult);
                    }
                });
            } else {
                validateFirewallRules(function(err){
                    if (err) {
                        return next(err);
                    }
                    
                    if (provisioningResult.ruleStatusUrls.length === 0) {
                        reply.state = 'succeeded';
                        reply.description = 'Created server ' + postgresqlServerName + '. Created firewall rules.';
                    } else {
                        reply.state = 'in progress';
                        reply.description = 'Created server ' + postgresqlServerName + '. Creating firewall rules.';
                    }
                    next(null, pollingResult);
                });
            }

        } else if (lastoperation === 'deprovision') {
            if (serverPollingUrl) {
                postgresqldbOperations.checkComplete(serverPollingUrl, function(err, status){
                    
                    log.info('cmd-poll: delete server status: %s', status);
                    if (status === 'InProgress') {
                        reply.state = 'in progress';
                        reply.description = 'Deleting the server.';
                    } else if (status === 'Succeeded') {
                        reply.state = 'succeeded';
                        reply.description = 'Server has been deleted.';
                    } else {
                        reply.state = 'failed';
                        reply.description = 'Failed to delete server.';
                    }
                    next(null, pollingResult);
                });
            } else {
                postgresqldbOperations.getServer(function (err, result) {
                    if (err) {
                        log.error('cmd-poll: check existence of postgresql server: err: %j', err);
                        next(err);
                    } else {
                        log.info('cmd-poll: check existence of postgresql server: result: %j', result);
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

module.exports = postgresqldbPoll;
