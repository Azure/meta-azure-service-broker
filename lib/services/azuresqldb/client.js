/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var uuid = require('node-uuid');
var HttpStatus = require('http-status-codes');
var request = require('request');
var async = require('async');
var util = require('util');
var common = require('../../common/');

var API_VERSIONS;

var sqldbOperations = function (log, azure) {
    this.log = log;
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
    this.activeDirectoryEndpointUrl = environment.activeDirectoryEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('sqldb client CTOR');

    function myRequest(url, qs, method, headers, form, json, next) {

        var requestObject = { url: url, qs: qs, method: method, headers: headers, form: form, json: json };
        async.waterfall([
            function (callback) {
                request(requestObject, function (err, res, body) {
                    if (err) {
                        log.error('sqldb client: error in REST request first attempt: %j', err);
                        callback(null, true, res, body);
                    } else {
                        callback(null, false, res, body);
                    }
                });
            },
            function (retry, response, prevBody, callback) {
                if (retry) {
                    request(requestObject, function (err, res, body) {
                        if (err) {
                            log.error('sqldb client: error in REST request retry 1: %j', err);
                            callback(null, true, res, body);
                        } else {
                            callback(null, false, res, body);
                        }
                    });
                } else {
                    callback(null, false, response, prevBody);
                }
            },
            function (retry, response, prevBody, callback) {
                if (retry) {
                    request(requestObject, function (err, res, body) {
                        if (err) {
                            log.error('sqldb client: error in REST request retry 2: %j', err);
                            callback(err, res, body);
                        } else {
                            callback(null, res, body);
                        }
                    });
                } else {
                    callback(null, response, prevBody);
                }
            }
        ], function (err, response, body) {
            next(err, response, body);
        });

    }

    this.POST = function (url, headers, data, apiVersion, useForm, callback) {

        myRequest(url, { 'api-version': apiVersion }, 'POST', headers, (useForm ? data : null), (useForm ? null : data), function(err, response, body) {
            callback(err, response, body);
        });

    };

    this.PUT = function (url, headers, data, apiVersion, callback) {

        myRequest(url, { 'api-version': apiVersion }, 'PUT', headers, null, data, function(err, response, body) {
            callback(err, response, body);
        });

    };

    this.GET = function (url, headers, apiVersion, callback) {

        myRequest(url, { 'api-version': apiVersion }, 'GET', headers, null, null, function(err, response, body) {
            callback(err, response, body);
        });

    };

    this.DELETE = function (url, headers, apiVersion, callback) {

        myRequest(url, { 'api-version': apiVersion }, 'DELETE', headers, null, null, function(err, response, body) {
            callback(err, response, body);
        });

    };

};

sqldbOperations.prototype.getToken = function (callback) {

    var that = this;

    that.log.info('sqldb client: getToken');
    var url = this.activeDirectoryEndpointUrl + '/' + this.azure.tenantId + '/oauth2/token';
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    var data = {
        grant_type: 'client_credentials',
        client_id: this.azure.clientId,
        client_secret: this.azure.clientSecret,
        resource: this.resourceManagerEndpointUrl,
        scope: 'user_impersonation'
    };
    that.POST(url, headers, data, API_VERSIONS.TOKEN, true, function (err, response, body) {
        
        common.logHttpResponse(that.log, response, 'Get authorization token', false);
        
        that.log.info('sqldb client: getToken: POST invocation');
        if (err) {
            callback(err);
        } else if (response.statusCode == HttpStatus.OK) {
            var accessToken = JSON.parse(body).access_token;
            callback(null, accessToken);
        } else {
            callback(Error(body));
        }
    });
};

sqldbOperations.prototype.setParameters = function (accessToken, resourceGroupName, sqlServerName, sqldbName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);
    this.sqldbUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);

    this.sqlServerName = sqlServerName;
    this.sqldbName = sqldbName;
    this.resourceType = 'Microsoft.Sql/servers/databases';

    this.id = util.format('subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/json'
    };

};

sqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
        properties: {
            startIpAddress: startIpAddress,
            endIpAddress: endIpAddress
        }
    };

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createFirewallRule', that.standardHeaders);
    that.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.SQL, function (err, res, body) {
        
        common.logHttpResponse(that.log, res, 'Create SQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createFirewallRule: err %j', err);
            callback(err, null);
        } else if (res.statusCode === HttpStatus.OK) {
            callback(null, result);
        } else {
            that.log.info('sqldb client: createFirewallRule: body: %j', body);
            result.body = body;
            callback(null, result);
        }

    });
};

sqldbOperations.prototype.getServer = function (parameters, callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - getServer', that.standardHeaders);
    that.GET(that.serverUrl, headers, API_VERSIONS.SQL, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Get SQL server', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: getServer: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.info('sqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            that.log.info('sqldb client: getServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    // create local object in case firewall rules are present
    var sqlServerParameters = {};
    sqlServerParameters.tags = common.mergeTags(parameters.sqlServerParameters.tags);
    sqlServerParameters.location = parameters.sqlServerParameters.location;
    sqlServerParameters.properties = parameters.sqlServerParameters.properties;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createServer', that.standardHeaders);
    that.PUT(that.serverUrl, headers, sqlServerParameters, API_VERSIONS.SQL, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Create SQL server', false);

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createServer: err %j', err);
            callback(err, null);
        } else if (result.statusCode != HttpStatus.CREATED) {
            var e = new Error();
            e.statusCode = result.statusCode;
            e.code = body.code;
            e.message = body.message;
            callback(e, null);
        } else {
            that.log.info('sqldb client: createServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.getDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - getDatabase', that.standardHeaders);
    that.GET(that.sqldbUrl, headers, API_VERSIONS.SQL, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Get SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: getDatabase: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.info('sqldb client: getDatabase: NotFound');
            callback(null, result);
        } else { // this includes OK and anything else besides NOT_FOUND
            that.log.info('sqldb client: getDatabase: body: %j', body);
            result.body = JSON.parse(body);
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createDatabase = function (parameters, callback) {

    var that = this;

    parameters.sqldbParameters.tags = common.mergeTags(parameters.sqldbParameters.tags);

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createDatabase', that.standardHeaders);
    that.PUT(that.sqldbUrl, headers, parameters.sqldbParameters, API_VERSIONS.SQL, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Create SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createDatabase: err %j', err);
            callback(err, null);
        } else if (result.statusCode != HttpStatus.ACCEPTED) {
            var e = new Error();
            e.statusCode = result.statusCode;
            e.code = body.code;
            e.message = body.message;
            callback(e, null);
        } else {
            that.log.info('sqldb client: createDatabase: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.deleteDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - deleteDatabase', that.standardHeaders);
    that.DELETE(that.sqldbUrl, headers, API_VERSIONS.SQL, function (err, res, body) {
        
        common.logHttpResponse(that.log, res, 'Delete SQL database', true);

        if (err) {
            that.log.info('sqldb client: deleteDatabase: err %j', err);
            return callback(err);
        }
        if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
            that.log.info('sqldb client: deleteDatabase');
            callback(null);
        } else {
            var e = new Error();
            e.statusCode = res.statusCode;
            e.message = '';
            callback(e);
        }
    });
};

module.exports = sqldbOperations;
