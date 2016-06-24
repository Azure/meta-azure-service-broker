/* jshint camelcase: false */
/* jshint newcap: false */
var HttpStatus = require('http-status-codes');
var request = require('request');

var TOKEN_API_VERSION = '2015-05-01-preview';
var AZURE_RESOURCE_MANAGER_ENDPOINT = 'https://management.azure.com/';
var MOONCAKE_RESOURCE_MANAGER_ENDPOINT = 'https://management.chinacloudapi.cn/';
var AZURE_AD_ENDPOINT = 'https://login.windows.net/';
var MOONCAKE_AD_ENDPOINT = 'https://login.chinacloudapi.cn/';

var sqldbOperations = function (log, azure) {
    this.log = log;
    this.azure = azure;
    this.apiVersion = TOKEN_API_VERSION;
    this.qs = { 'api-version': this.apiVersion };
    this.resourceManagerEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_RESOURCE_MANAGER_ENDPOINT : AZURE_RESOURCE_MANAGER_ENDPOINT;
    this.activeDirectoryEndpointUrl = (azure.environment == 'AzureChinaCloud') ? MOONCAKE_AD_ENDPOINT : AZURE_AD_ENDPOINT;
    
    log.debug('sqldb client: apiVersion: %j', this.apiVersion);

    /* override post, request format: form*/
    this.formPOST = function (url, data, callback) {
        request({
            url: url,
            qs: this.qs,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            form: data
        }, function (err, response, body) {
            //if (err) retry?
            callback(err, response, body);
        });
    };
};

sqldbOperations.prototype.getToken = function(callback) {

    var log = this.log;
    
    log.debug('sqldb client: getToken');
    var url = this.activeDirectoryEndpointUrl + this.azure.tenant_id + '/oauth2/token';
    var data = {
          'grant_type': 'client_credentials',
          'client_id': this.azure.client_id,
          'client_secret': this.azure.client_secret,
          'resource': this.resourceManagerEndpointUrl,
          'scope': 'user_impersonation'
    };    
    this.formPOST(url, data, function(err, response, body) {
        log.debug('sqldb client: getToken: formPOST invocation, err: %j', err);
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

sqldbOperations.prototype.provision = function (accessToken, resourceGroup, sqlServerName, sqldbName, parameters, next) {

    var log = this.log;
    
    log.debug('sqldb client: provision');

    var url = '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}'
        .format(this.resourceManagerEndpointUrl, this.azure.subscription_id, resourceGroup, sqlServerName, sqldbName);
        
    log.debug('sqldb client: provision: url: %j', url);

    next(null, 'OK');

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
