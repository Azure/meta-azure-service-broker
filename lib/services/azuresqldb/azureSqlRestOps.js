/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';
var util = require('util');
var azureRestOps = require('./azureRestOps');

var SQL_API_VERSION = '2014-04-01-preview';
var AZURE_RESOURCE_MANAGER_ENDPOINT = 'https://management.azure.com/';
var MOONCAKE_RESOURCE_MANAGER_ENDPOINT = 'https://management.chinacloudapi.cn/';

var azureSqlRestOps = function(log, params) {
    this.log = log;
    this.params = params;
    this.apiVersion = SQL_API_VERSION;
    this.qs = {"api-version" : this.apiVersion};
    this.resourceManagerEndpointUrl = (this.params.environment == 'AzureChinaCloud') ? MOONCAKE_RESOURCE_MANAGER_ENDPOINT : AZURE_RESOURCE_MANAGER_ENDPOINT;    
}

util.inherits(azureSqlRestOps, azureRestOps);

azureSqlRestOps.prototype.createOrUpdateSqlServer = function(token, serverName, callback) {
    // 1. get token -> headers
    // 2. build url
    // 3. build PUT data
    var url = "{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}".format(this.resourceManagerEndpointUrl, this.params.azure.subscription_id, this.params.parameters.resourceGroup, serverName);
    console.log("%s", url);
    var headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + token
    }
    
    var administratorLogin = "guwe";
    var administratorLoginPassword = "User!123";
    var state = "server-state";
    var data = {
        "location": "southeastasia",
        "tags":{"updatedAt":"4/29/2016"},
        "properties": {
            "version": "12.0",
            "administratorLogin": "guwe",
            "administratorLoginPassword": "User!123",
            "state": "server-state"
        }
    } //TBD
    this.PUT(url, headers, data, function(err, response, body) {
        callback(err, response, body);
    });
};

azureSqlRestOps.prototype.createOrUpdateSqlDatabase = function(token, serverName, databaseName, callback) {
    var url = "{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}".format(this.resourceManagerEndpointUrl, this.params.azure.subscription_id, this.params.parameters.resourceGroup, serverName, databaseName);
    console.log("%s", url);
    var headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + token
    }
    

    var serverLocation = this.params.parameters.parameters.location;
    var createMode = "Default";
    //var sourceDatabaseId = "http://fake";
    var edition = "Standard";
    var collation = "SQL_LATIN1_GENERAL_CP1_CI_AS";
    var maxSizeBytes = "5368709120"
    //var requestedServiceObjectiveId = 1
    var requestedServiceObjectiveName = "S0";
    //var sourceDatabaseDeletionDate = 1
    //var restorePointInTime = 1
    //var elasticPoolName = 1
    var data = {
        "tags":{},
        "location": serverLocation,
        "properties": {
            "createMode": createMode,
            "edition": edition,
            "collation": collation,
            "maxSizeBytes": maxSizeBytes,
            "requestedServiceObjectiveName": requestedServiceObjectiveName
        }
    } //TBD    
    this.PUT(url, headers, data, function(err, response, body) {
        callback(err, response, body);        
    });
};

azureSqlRestOps.prototype.getSqlDatabase = function(token, serverName, databaseName, callback) {
    var url = "{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}".format(this.resourceManagerEndpointUrl, this.params.azure.subscription_id, this.params.parameters.resourceGroup, serverName, databaseName);
    console.log("%s", url);
    var headers = {
            'Authorization': 'Bearer ' + token
    }    
    this.GET(url, headers, function(err, response, body) {
        callback(err, response, body);       
    });
}

azureSqlRestOps.prototype.deleteSqlDatabase = function(token, serverName, databaseName, callback) {
    var url = "{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.Sql/servers/{3}/databases/{4}".format(this.resourceManagerEndpointUrl, this.params.azure.subscription_id, this.params.parameters.resourceGroup, serverName, databaseName);
    console.log("%s", url);
    var headers = {
            'Authorization': 'Bearer ' + token
    } 
    this.DELETE(url, headers, function(err, response, body) {
        callback(err, response, body);        
    });
}

module.exports = azureSqlRestOps;
