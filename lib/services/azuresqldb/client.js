/* jshint camelcase: false */
/* jshint newcap: false */
var HttpStatus = require('http-status-codes');
var request = require('request');
var async = require('async');
var util = require('util');

var API_VERSION_FOR_TOKEN = '2015-05-01-preview';
var API_VERISON_FOR_RESOURCE_GROUP = '2015-11-01';
var API_VERSION_FOR_SQL = '2014-04-01-preview';
var AZURE_RESOURCE_MANAGER_ENDPOINT = 'https://management.azure.com/';
var MOONCAKE_RESOURCE_MANAGER_ENDPOINT = 'https://management.chinacloudapi.cn/';
var AZURE_AD_ENDPOINT = 'https://login.windows.net';
var MOONCAKE_AD_ENDPOINT = 'https://login.chinacloudapi.cn';

var sqldbOperations = function (log, azure) {
    this.log = log;
    this.azure = azure;
    this.resourceManagerEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_RESOURCE_MANAGER_ENDPOINT : AZURE_RESOURCE_MANAGER_ENDPOINT;
    this.activeDirectoryEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_AD_ENDPOINT : AZURE_AD_ENDPOINT;

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
    var url = this.activeDirectoryEndpointUrl + '/' + this.azure.tenant_id + '/oauth2/token';
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    var data = {
        grant_type: 'client_credentials',
        client_id: this.azure.client_id,
        client_secret: this.azure.client_secret,
        resource: this.resourceManagerEndpointUrl,
        scope: 'user_impersonation'
    };
    that.POST(url, headers, data, API_VERSION_FOR_TOKEN, true, function (err, response, body) {
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

sqldbOperations.prototype.setParameters = function (accessToken, resourceGroupName, sqlServerName, sqldbName, firewallRuleName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroupName, sqlServerName);
    this.sqldbUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroupName, sqlServerName, sqldbName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/firewallRules/%s',
        this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroupName, sqlServerName, firewallRuleName);

    this.sqlServerName = sqlServerName;
    this.sqldbName = sqldbName;
    this.resourceType = 'Microsoft.Sql/servers/databases';

    this.id = util.format('subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.azure.subscription_id, resourceGroupName, sqlServerName, sqldbName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
    };

};

sqldbOperations.prototype.createFirewallRule = function (startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {};
    data.properties = {};
    data.properties.startIpAddress = startIpAddress;
    data.properties.endIpAddress = endIpAddress;

    that.PUT(that.firewallRuleUrl, that.standardHeaders, data, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.info('sqldb client: createFirewallRule');

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

    that.GET(that.serverUrl, that.standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.info('sqldb client: getServer');

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
    sqlServerParameters.location = parameters.sqlServerParameters.location;
    sqlServerParameters.properties = parameters.sqlServerParameters.properties;
    
    that.PUT(that.serverUrl, that.standardHeaders, sqlServerParameters, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.info('sqldb client: createServer');

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createServer: err %j', err);
            callback(err, null);
        } else {
            that.log.info('sqldb client: createServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.getDatabase = function (callback) {

    var that = this;

    that.GET(that.sqldbUrl, that.standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.info('sqldb client: getDatabase');

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

    that.PUT(that.sqldbUrl, that.standardHeaders, parameters.sqldbParameters, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.info('sqldb client: createDatabase: parameters: %j', parameters.sqldbParameters);

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createDatabase: err %j', err);
            callback(err, null);
        } else {
            that.log.info('sqldb client: createDatabase: body: %j', body);
            result.body = body;         // sample: { operation: 'CreatingLogicalDatabase', startTime: '/Date(1467536353090+0000)/'}
            result.body.id = that.id;   // add this so it can be returned in provisioningResult
            result.body.type = that.resourceType;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.deleteDatabase = function (callback) {

    var that = this;

    that.DELETE(that.sqldbUrl, that.standardHeaders, API_VERSION_FOR_SQL, function (err, res) {

        that.log.info('sqldb client: deleteDatabase');

        if (err) {
            that.log.info('sqldb client: deleteDatabase: err %j', err);
            callback(err, null);
        } else {
            that.log.info('sqldb client: deleteDatabase');
            callback(null, { statusCode: res.statusCode });
        }
    });
};

module.exports = sqldbOperations;
