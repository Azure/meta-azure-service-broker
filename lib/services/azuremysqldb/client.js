/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var mysqldbOperations = function (azure) {
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('client CTOR');

};

mysqldbOperations.prototype.setParameters = function (resourceGroupName, mysqlServerName, mysqlDatabaseName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);
    this.databaseUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s/databases/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName, mysqlDatabaseName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8'
    };

};

mysqldbOperations.prototype.checkComplete = function (url, callback) {
    
    var that = this;
    
    var headers = common.mergeCommonHeaders('client - checkComplete', that.standardHeaders);
    msRestRequest.GET(url, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: checkComplete: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'checkComplete', true);

        if (res.statusCode === HttpStatus.OK) {
            var status = (JSON.parse(body)).status;
            if (status === 'Failed' || status === 'Canceled') {
                log.error('client: checkComplete: body: %s', body);
                return common.formatErrorFromRes(res, callback);
            }
            
            log.info('client: checkComplete: body: %s', body);
            callback(null, status);
        } else {
            log.error('client: checkComplete: body: %s', body);
            return common.formatErrorFromRes(res, callback);
        }

    });
};

function handleAsyncOperationRes(res, name, callback) {
    if (res.statusCode !== HttpStatus.ACCEPTED) {
        log.error('client: %s: %j', name, res.body);
        return common.formatErrorFromRes(res, callback);
    } else {
        log.info('client: %s: Accepted', name);
        callback(null, res['headers']['azure-asyncoperation']);
    }
}

mysqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
        properties: {
            startIpAddress: startIpAddress,
            endIpAddress: endIpAddress
        }
    };

    var headers = common.mergeCommonHeaders('client - createFirewallRule', that.standardHeaders);
    msRestRequest.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: createFirewallRule: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Create MySQL server firewall rules', true);
        
        handleAsyncOperationRes(res, 'createFirewallRule', callback);
    });
};

mysqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - getServer', that.standardHeaders);
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: getServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'client - getServer', true);

        if (res.statusCode == HttpStatus.NOT_FOUND) {
            log.info('client: getServer: NotFound');
        } else {  // this includes OK and anything else besides NOT_FOUND
            log.info('client: getServer: body: %j', body);
            res.body = JSON.parse(body);
        }
        callback(null, res);
    });

};

mysqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    var mysqlServerParameters = {};
    mysqlServerParameters.tags = common.mergeTags(parameters.mysqlServerParameters.tags);
    mysqlServerParameters.location = parameters.location;
    mysqlServerParameters.sku = parameters.sku;
    mysqlServerParameters.properties = parameters.mysqlServerParameters.properties;

    var headers = common.mergeCommonHeaders('client - createServer', that.standardHeaders);
    msRestRequest.PUT(that.serverUrl, headers, mysqlServerParameters, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: createServer: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create MySQL server', true);

        handleAsyncOperationRes(res, 'createServer', callback);
    });

};

mysqldbOperations.prototype.deleteServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - deleteServer', that.standardHeaders);
    msRestRequest.DELETE(that.serverUrl, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: deleteServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Delete MySQL server', true);

        if (res.statusCode === HttpStatus.NO_CONTENT) {
            log.info('client: deleteServer: NO_CONTENT');
            callback(null);
        } else {
            handleAsyncOperationRes(res, 'deleteServer', callback);
        }
    });

};

mysqldbOperations.prototype.createDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - createDatabase', that.standardHeaders);
    msRestRequest.PUT(that.databaseUrl, headers, {}, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('client: createDatabase: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create MySQL database', true);

        handleAsyncOperationRes(res, 'createDatabase', callback);
    });

};

module.exports = mysqldbOperations;
