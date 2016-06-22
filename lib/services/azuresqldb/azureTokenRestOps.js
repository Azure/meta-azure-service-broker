/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';
var request = require('request');

var TOKEN_API_VERSION = '2015-05-01-preview';
var AZURE_RESOURCE_MANAGER_ENDPOINT = 'https://management.azure.com/';
var MOONCAKE_RESOURCE_MANAGER_ENDPOINT = 'https://management.chinacloudapi.cn/';
var AZURE_AD_ENDPOINT = 'https://login.windows.net/';
var MOONCAKE_AD_ENDPOINT = 'https://login.chinacloudapi.cn/';

var azureTokenRestOps = function(log, azure) {
    this.log = log;
    this.azure = azure;
    this.apiVersion = TOKEN_API_VERSION;
    this.qs = {"api-version" : this.apiVersion};
    this.resourceManagerEndpointUrl = (azure.environment == 'AzureChinaCloud') ?  MOONCAKE_RESOURCE_MANAGER_ENDPOINT : AZURE_RESOURCE_MANAGER_ENDPOINT;
    this.activeDirectoryEndpointUrl = (azure.environment == 'AzureChinaCloud') ?  MOONCAKE_AD_ENDPOINT : AZURE_AD_ENDPOINT;
    
    /* override post, request format: form*/
    this.formPOST = function(url, data, callback) {
        request({
            url: url,
            qs: this.qs,
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            form: data
        }, function(err, response, body){
            //if (err) retry?
            callback(err, response, body);
        });
    }
    
}

azureTokenRestOps.prototype.getToken = function(callback) {
    var url = this.activeDirectoryEndpointUrl + this.azure.tenant_id + "/oauth2/token"
    var data = {
          'grant_type': 'client_credentials',
          'client_id': this.azure.client_id,
          'client_secret': this.azure.client_secret,
          'resource': this.resourceManagerEndpointUrl,
          'scope': 'user_impersonation'
    }    
    this.formPOST(url, data, function(err, response, body) {
        if (err) {
            callback(err);
        }else if(response.statusCode == 200) {
            var accessToken = JSON.parse(body).access_token;
            callback(null, accessToken);
        } else {
            callback(Error(body));
        }
    })
}

module.exports = azureTokenRestOps;
