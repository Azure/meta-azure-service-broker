/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var postgresqldbOperations = function (azure) {
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('client CTOR');

};

postgresqldbOperations.prototype.setParameters = function (resourceGroupName, postgresqlServerName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforPostgreSQL/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, postgresqlServerName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforPostgreSQL/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, postgresqlServerName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8'
    };

};

postgresqldbOperations.prototype.createResourceGroup = function (resourceGroupName, groupParameters, callback) {

    var that = this;

    resourceGroup.createOrUpdate(
        'PostgreSqlDb',
        that.azure,
        resourceGroupName,
        groupParameters,
        callback
    );
};

postgresqldbOperations.prototype.checkComplete = function (url, callback) {
    
    var that = this;
    
    var headers = common.mergeCommonHeaders('client - checkComplete', that.standardHeaders);
    msRestRequest.GET(url, headers, API_VERSIONS.POSTGRESQL, function (err, res, body) {
        if (err) {
            log.error('client: checkComplete: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'checkComplete', true);

        if (res.statusCode === HttpStatus.OK) {
            var status = (JSON.parse(body)).status;
            if (status === 'Failed') {
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

postgresqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
        properties: {
            startIpAddress: startIpAddress,
            endIpAddress: endIpAddress
        }
    };

    var headers = common.mergeCommonHeaders('client - createFirewallRule', that.standardHeaders);
    msRestRequest.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.POSTGRESQL, function (err, res, body) {
        if (err) {
            log.error('client: createFirewallRule: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Create PostgreSQL server firewall rules', true);
        
        if (res.statusCode === HttpStatus.ACCEPTED) {
            log.info('client: createFirewallRule: Accepted');
        } else {
            log.info('client: createFirewallRule: body: %j', body);
        }
        callback(null, res);

    });
};

postgresqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - getServer', that.standardHeaders);
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.POSTGRESQL, function (err, res, body) {
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

postgresqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    var postgresqlServerParameters = {};
    postgresqlServerParameters.tags = common.mergeTags(parameters.postgresqlServerParameters.tags);
    postgresqlServerParameters.location = parameters.location;
    postgresqlServerParameters.sku = parameters.sku;
    postgresqlServerParameters.properties = parameters.postgresqlServerParameters.properties;

    var headers = common.mergeCommonHeaders('client - createServer', that.standardHeaders);
    msRestRequest.PUT(that.serverUrl, headers, postgresqlServerParameters, API_VERSIONS.POSTGRESQL, function (err, res, body) {
        if (err) {
            log.error('client: createServer: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create PostgreSQL server', true);

        if (res.statusCode !== HttpStatus.ACCEPTED) {
            log.error('client: createServer: %j', body);
            return common.formatErrorFromRes(res, callback);
        } else {
            log.info('client: createServer: Accepted');
            callback(null, res['headers']['azure-asyncoperation']);
        }
    });

};

postgresqldbOperations.prototype.deleteServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - deleteServer', that.standardHeaders);
    msRestRequest.DELETE(that.serverUrl, headers, API_VERSIONS.POSTGRESQL, function (err, res, body) {
        if (err) {
            log.error('client: deleteServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Delete PostgreSQL server', true);

        if (res.statusCode === HttpStatus.ACCEPTED) {
            log.info('client: deleteServer: Accepted');
            callback(null, res['headers']['azure-asyncoperation']);
        } else if (res.statusCode === HttpStatus.NO_CONTENT) {
            log.info('client: deleteServer: NO_CONTENT');
            callback(null);
        } else {
            log.error('client: deleteServer: %j', body);
            return common.formatErrorFromRes(res, callback);
        }
    });

};

module.exports = postgresqldbOperations;
