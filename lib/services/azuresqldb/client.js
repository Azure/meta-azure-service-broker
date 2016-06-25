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

sqldbOperations.prototype.provision = function (accessToken, parameters, next) {

    var that = this;

    that.log.debug('sqldb client: provision');

    var standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
    };
    var serverUrl = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}'
        .format(that.resourceManagerEndpointUrl, that.azure.subscription_id, parameters.resourceGroup, parameters.sqlServerName);
    var sqldbUrl = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}'
        .format(that.resourceManagerEndpointUrl, that.azure.subscription_id, parameters.resourceGroup, parameters.sqlServerName, parameters.sqldbName);

    async.waterfall([
        function (callback) {    // get server to see if it exists
            that.GET(serverUrl, standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {
                that.log.debug('sqldb client: provision: async.waterfall/check server existence callback');
                if (err) {
                    that.log.debug('sqldb client: provision: async.waterfall/check server existence callback: err %j', err);
                    callback(err, null);
                } else if (res.statusCode == HttpStatus.OK) {
                    that.log.debug('sqldb client: provision: async.waterfall/check server existence callback: OK');
                    callback(null, true);
                } else if (res.statusCode == HttpStatus.NOT_FOUND) {
                    that.log.debug('sqldb client: provision: async.waterfall/check server existence callback: NotFound');
                    callback(null, false);
                } else {
                    that.log.debug('sqldb client: provision: async.waterfall/check server existence callback: body: %j', body);
                    callback(Error(body), null);
                }
            });
        },
        function (serverExists, callback) { // create the sql server if it doesn't exist
            if (parameters.sqlServerCreateIfNotExist && !serverExists) {
                that.log.debug('sqldb client: provision: async.waterfall/create server: SQL server does not exist and parameter calls for its creation.');
                // create the server
                callback(null);
            } else if (!serverExists) {
                that.log.debug('sqldb client: provision: async.waterfall/create server: SQL server does not exist and parameter does NOT for its creation.');
                var err = new Error('Conflict');
                err.statusCode = HttpStatus.Conflict;
                callback(err);
            } else {    // server exists
                that.log.debug('sqldb client: provision: async.waterfall/create server: SQL server does exist.');
                callback(null);
            }
        },
        function (callback) {    // see if the database exists already
            that.GET(sqldbUrl, standardHeaders, API_VERSION_FOR_SQL, function (err, res, body) {
                that.log.debug('sqldb client: provision: async.waterfall/check database existence callback');
                if (err) {
                    that.log.debug('sqldb client: provision: async.waterfall/check database existence callback: err %j', err);
                    callback(err, 'Failed');
                } else if (res.statusCode == HttpStatus.OK) {
                    that.log.debug('sqldb client: provision: async.waterfall/check database existence callback: Database already exists.');
                    var err = new Error('Conflict: Requested SQL DB already exists.');
                    err.statusCode = HttpStatus.CONFLICT;
                    callback(err, 'Failed');
                } else if (res.statusCode == HttpStatus.NOT_FOUND) {
                    that.log.debug('sqldb client: provision: async.waterfall/check database existence callback: NotFound');
                    callback(null);
                } else {
                    that.log.debug('sqldb client: provision: async.waterfall/check database existence callback: body: %j', body);
                    callback(Error(body), 'Failed');
                }
            });
        },
        function (callback) {  // create the database if it doesn't exist yet.
            that.log.debug('sqldb client: provision: async.waterfall/create server: SQL db does not exist. Creating it.');
            that.PUT(sqldbUrl, standardHeaders, parameters.sqldbParameters, API_VERSION_FOR_SQL, function (err, res, body) {
                that.log.debug('sqldb client: provision: async.waterfall/create database callback');
                if (err) {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: err %j', err);
                    callback(err, 'Failed');
                } else if (res.statusCode == HttpStatus.CREATED) {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: Created');
                    callback(null, 'Created');
                } else if (res.statusCode == HttpStatus.OK) {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: OK');
                    callback(null, 'OK');
                } else if (res.statusCode == HttpStatus.ACCEPTED) {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: Accepted');
                    callback(null, 'Accepted');
                } else if (res.statusCode == HttpStatus.CONFLICT) {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: Conflict');
                    var err = new Error('Conflict: Requested SQL DB already exists.');
                    err.statusCode = HttpStatus.CONFLICT;
                    callback(err, 'Failed');
                } else {
                    that.log.debug('sqldb client: provision: async.waterfall/create database callback: body: %j', body);
                    callback(Error(body), null);
                }
            });
        }
    ], function (err, result) {
        that.log.debug('sqldb client: async.waterfall/final callback: result: %j', result);
        next(err, result);
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

// utility REST routines

function utilityCreateSqlServer(log, accessToken, rmEndpointUrl, subscriptionId, resourceGroup, sqlServerName, sqlServerParameters, next) {

    var url = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}'
        .format(rmEndpointUrl, subscriptionId, resourceGroup, sqlServerName);
    log.debug('sqldb client: utilityCreateSqlServer: url: %j', url);
    log.debug('sqldb client: utilityCreateSqlServer: sqlServerParameters: %j', sqlServerParameters);

    var headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + accessToken
    };


    next(null, 'OK');
};

module.exports = sqldbOperations;
