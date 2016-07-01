/* jshint camelcase: false */
/* jshint newcap: false */
var HttpStatus = require('http-status-codes');
var request = require('request');
var async = require('async');

var API_VERSION_FOR_TOKEN = '2015-05-01-preview';
var API_VERISON_FOR_RESOURCE_GROUP = '2015-11-01';
var API_VERSION_FOR_SQL = '2014-04-01-preview';
var AZURE_RESOURCE_MANAGER_ENDPOINT = 'https://management.azure.com/';
var MOONCAKE_RESOURCE_MANAGER_ENDPOINT = 'https://management.chinacloudapi.cn/';
var AZURE_AD_ENDPOINT = 'https://login.windows.net/';
var MOONCAKE_AD_ENDPOINT = 'https://login.chinacloudapi.cn/';

var sqldbOperations = function (log, azure) {
    this.log = log;
    this.azure = azure;
    this.resourceManagerEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_RESOURCE_MANAGER_ENDPOINT : AZURE_RESOURCE_MANAGER_ENDPOINT;
    this.activeDirectoryEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_AD_ENDPOINT : AZURE_AD_ENDPOINT;

    log.debug('sqldb client CTOR');

    this.POST = function (url, headers, data, apiVersion, useForm, callback) {
        request({
            url: url,
            qs: { 'api-version': apiVersion },
            method: 'POST',
            headers: headers,
            form: useForm ? data : null,
            json: useForm ? null : data
        }, function (err, response, body) {
            //if (err) retry?
            callback(err, response, body);
        });
    };

    this.PUT = function (url, headers, data, apiVersion, callback) {
        request({
            url: url,
            qs: { 'api-version': apiVersion },
            method: 'PUT',
            headers: headers,
            json: data
        }, function (err, response, body) {
            //if (err) retry?
            callback(err, response, body);
        });
    };

    this.GET = function (url, headers, apiVersion, callback) {
        request({
            url: url,
            qs: { 'api-version': apiVersion },
            method: 'GET',
            headers: headers
        }, function (err, response, body) {
            //if (err) retry?
            callback(err, response, body);
        });
    };
};

sqldbOperations.prototype.getToken = function (callback) {

    var that = this;

    that.log.debug('sqldb client: getToken');
    var url = this.activeDirectoryEndpointUrl + this.azure.tenant_id + '/oauth2/token';
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    var data = {
        grant_type: 'client_credentials',
        client_id: this.azure.client_id,
        client_secret: this.azure.client_secret,
        resource: this.resourceManagerEndpointUrl,
        scope: 'user_impersonation'
    };
    that.POST(url, headers, data, API_VERSION_FOR_TOKEN, true, function (err, response, body) {
        that.log.debug('sqldb client: getToken: POST invocation');
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

    this.serverUrl = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}'
        .format(this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroupName, sqlServerName);
    this.sqldbUrl = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}'
        .format(this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroupName, sqlServerName, sqldbName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
    };

}

sqldbOperations.prototype.getServer = function (parameters, callback) {

    var that = this;

    that.GET(that.serverUrl, that.standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.debug('sqldb client: getServer');

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.debug('sqldb client: getServer: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.debug('sqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            that.log.debug('sqldb client: getServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    that.PUT(that.serverUrl, that.standardHeaders, parameters.sqlServerParameters, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.debug('sqldb client: createServer');

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.debug('sqldb client: createServer: err %j', err);
            callback(err, null);
        } else {
            that.log.debug('sqldb client: createServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.getDatabase = function (callback) {

    var that = this;

    that.GET(that.sqldbUrl, that.standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.debug('sqldb client: getDatabase');

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.debug('sqldb client: getDatabase: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.debug('sqldb client: getDatabase: NotFound');
            callback(null, result);
        } else { // this includes OK and anything else besides NOT_FOUND
            that.log.debug('sqldb client: getDatabase: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createDatabase = function (parameters, callback) {

    var that = this;

    that.PUT(that.sqldbUrl, that.standardHeaders, parameters.sqldbParameters, API_VERSION_FOR_SQL, function (err, res, body) {

        that.log.debug('sqldb client: createDatabase');

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.debug('sqldb client: createDatabase: err %j', err);
            callback(err, 'null');
        } else {
            that.log.debug('sqldb client: createDatabase: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.poll = function (resourceGroup, sqldbName, next) {

    var log = this.log;

    log.debug('sqldb client: poll');

    next(null, 'OK');

};

sqldbOperations.prototype.deprovision = function (resourceGroup, sqldbName, next) {

    var log = this.log;

    log.debug('sqldb client: deprovision');

    next(null, 'OK');

};

sqldbOperations.prototype.bind = function (next) {

    var log = this.log;

    log.debug('sqldb client: bind');

    next(null, 'OK');

};

sqldbOperations.prototype.unbind = function (next) {

    var log = this.log;

    log.debug('sqldb client: unbind');

    next(null, 'OK');

};

module.exports = sqldbOperations;
