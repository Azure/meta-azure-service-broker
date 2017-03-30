/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');
var sqlDb = require('mssql');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var sqldbOperations = function (azure) {
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('sqldb client CTOR');

};

sqldbOperations.prototype.setParameters = function (resourceGroupName, sqlServerName, sqldbName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);
    this.sqldbUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);
    this.transparentDataEncryptionUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s/transparentDataEncryption/current',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);

    this.sqlServerName = sqlServerName;
    this.sqldbName = sqldbName;
    this.resourceType = 'Microsoft.Sql/servers/databases';

    this.id = util.format('subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json'
    };

};

sqldbOperations.prototype.createResourceGroup = function (resourceGroupName, groupParameters, callback) {

    var that = this;

    resourceGroup.createOrUpdate(
        'SqlDb',
        that.azure,
        resourceGroupName,
        groupParameters,
        callback
    );
};

sqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
        properties: {
            startIpAddress: startIpAddress,
            endIpAddress: endIpAddress
        }
    };

    var headers = common.mergeCommonHeaders('sqldb client - createFirewallRule', that.standardHeaders);
    msRestRequest.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.error('sqldb client: createFirewallRule: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Create SQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode === HttpStatus.OK) {
            callback(null, result);
        } else {
            log.info('sqldb client: createFirewallRule: body: %j', body);
            result.body = body;
            callback(null, result);
        }

    });
};

sqldbOperations.prototype.setTransparentDataEncryption = function (callback){
    
    var that = this;

    var data = {
        properties: {
            status: 'Enabled'
        }
    };

    var headers = common.mergeCommonHeaders('sqldb client - setTransparentDataEncryption', that.standardHeaders);
    msRestRequest.PUT(that.transparentDataEncryptionUrl, headers, data, API_VERSIONS.SQL, function(err, res, body) {
        if (err) {
            log.error('sqldb client: setTransparentDataEncryption: err: %j', err);
            return callback(err, res);
        }
        
        common.logHttpResponse(res, 'Set transparent data encryption', true);

        log.info('sqldb client: setTransparentDataEncryption: body: %j', body);
        res.body = body;
        callback(null, res);
    });
};

sqldbOperations.prototype.deleteFirewallRule = function (ruleName, callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('sqldb client - deleteFirewallRule', that.standardHeaders);
    msRestRequest.DELETE(that.firewallRuleUrl + ruleName, headers, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.error('sqldb client: deleteFirewallRule: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Delete SQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode === HttpStatus.OK || res.statusCode === HttpStatus.NO_CONTENT) {
            callback(null);
        } else {
            result.body = body;
            log.error('sqldb client: deleteFirewallRule: err: %j', result);
            callback(result);
        }

    });
};

sqldbOperations.prototype.executeSql = function (config, sql, isDeleteFirewallRuleAfter, callback) {

    var that = this;
    
    var tempFirewallRuleName = 'broker-temp-rule-' + that.sqldbName;
    
    log.info('sqldb: Connecting to database %s in server %s ...', config.database, config.server);
    var conn = sqlDb.connect(config, function(err) {
        if (err) {
            if (err.message.startsWith('Cannot open server')) {
                log.info('sqldb: failed to login server: %s', err);
                log.info('sqldb: It is going to create a temp firewall rule');
                
                //example message: 'Cannot open server \'asdasd\' requested by the login. Client with IP address \'168.61.65.xxx\' is not allowed to access the server.  To enable access, use the Windows Azure Management Portal or run sp_set_firewall_rule on the master database to create a firewall rule for this IP address or address range.  It may take up to five minutes for this change to take effect.'
                var runnerIpPrefix = err.message.match(/\d+\.\d+\.\d+\./)[0];

                return that.createFirewallRule(tempFirewallRuleName, runnerIpPrefix + '0', runnerIpPrefix + '255', function(err, result){
                    if (err) {
                        log.error('sqldb: create temp firewall rule: err: %j', err);
                        callback(err);
                    } else if ((result.statusCode === HttpStatus.OK) || (result.statusCode === HttpStatus.CREATED)) {
                        log.info('sqldb: create temp firewall rule: rule created');
                        that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
                    } else {
                        log.error('sqldb: create temp firewall rule, unexpected error: %j', result);
                        callback(result);
                    }
                });
            }

            log.error('sqldb client: connect to server: err %j', err);
            return callback(err);
        }

        log.info('sqldb: Connect to database %s in server %s: succeed.', config.database, config.server);
        log.info('sqldb: It is going to execute sql: %s', sql);
        var req = new sqlDb.Request(conn);
        req.query(sql, function(err) {
            conn.close();
            if (err) {
                return callback(err);
            }
            
            log.info('sqldb: executed sql: %s', sql);
            
            if (isDeleteFirewallRuleAfter) {
                that.deleteFirewallRule(tempFirewallRuleName, function(err){
                    if (err) {
                        log.error('sqldb: delete temp firewall rule: err: %j', err);
                        return callback(err);
                    }
                    log.info('sqldb: delete temp firewall rule: rule deleted');
                    callback(null);
                });
            } else callback(null);
        });
    });
};

sqldbOperations.prototype.createDatabaseLogin = function createDatabaseLogin(serverDomainName, adminLogin, adminLoginPassword, databaseLogin, databaseLoginPassword, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': 'master',
    'options': {
      'encrypt': true
    }
  };
  
  var sql = util.format('CREATE LOGIN "%s" WITH PASSWORD=\'%s\'', databaseLogin, databaseLoginPassword);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

sqldbOperations.prototype.dropDatabaseLogin = function dropDatabaseLogin(serverDomainName, adminLogin, adminLoginPassword, databaseLogin, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': 'master',
    'options': {
      'encrypt': true
    }
  };
  
  var sql = util.format('DROP LOGIN "%s"', databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

sqldbOperations.prototype.createUserForDatabaseLogin = function createUserForDatabaseLogin(serverDomainName, adminLogin, adminLoginPassword, databaseLogin, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': that.sqldbName,
    'options': {
      'encrypt': true
    }
  };
  
  var sql = util.format('CREATE USER "%s" FOR LOGIN "%s"', databaseLogin, databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

sqldbOperations.prototype.grantControlToUser = function grantControlToUser(serverDomainName, adminLogin, adminLoginPassword, databaseLogin, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': that.sqldbName,
    'options': {
      'encrypt': true
    }
  };
  
  var sql = util.format('GRANT CONTROL to "%s"', databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

sqldbOperations.prototype.dropUserOfDatabaseLogin = function dropUserOfDatabaseLogin(serverDomainName, adminLogin, adminLoginPassword, databaseLogin, isDeleteFirewallRuleAfter, callback) {
  var that = this;
  
  var config = {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': that.sqldbName,
    'options': {
      'encrypt': true
    }
  };
  
  var sql = util.format('DROP USER "%s"', databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
  
};

sqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('sqldb client - getServer', that.standardHeaders);
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.info('sqldb client: getServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'sqldb client - getServer', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode == HttpStatus.NOT_FOUND) {
            log.info('sqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            log.info('sqldb client: getServer: body: %j', body);
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
    sqlServerParameters.location = parameters.location;
    sqlServerParameters.properties = parameters.sqlServerParameters.properties;

    var headers = common.mergeCommonHeaders('sqldb client - createServer', that.standardHeaders);
    msRestRequest.PUT(that.serverUrl, headers, sqlServerParameters, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.info('sqldb client: createServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Create SQL server', true);

        var result = {};
        result.statusCode = res.statusCode;

        if (result.statusCode != HttpStatus.CREATED) {
            return common.formatErrorFromRes(res, callback);
        } else {
            log.debug('sqldb client: createServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.getDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('sqldb client - getDatabase', that.standardHeaders);
    msRestRequest.GET(that.sqldbUrl, headers, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.info('sqldb client: getDatabase: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Get SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode == HttpStatus.NOT_FOUND) {
            log.info('sqldb client: getDatabase: NotFound');
            callback(null, result);
        } else { // this includes OK and anything else besides NOT_FOUND
            log.info('sqldb client: getDatabase: body: %j', body);
            result.body = JSON.parse(body);
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createDatabase = function (parameters, callback) {

    var that = this;

    parameters.sqldbParameters.tags = common.mergeTags(parameters.sqldbParameters.tags);
    parameters.sqldbParameters.location = parameters.location;

    var headers = common.mergeCommonHeaders('sqldb client - createDatabase', that.standardHeaders);
    msRestRequest.PUT(that.sqldbUrl, headers, parameters.sqldbParameters, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.info('sqldb client: createDatabase: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (result.statusCode != HttpStatus.ACCEPTED) {
            return common.formatErrorFromRes(res, callback);
        } else {
            log.info('sqldb client: createDatabase: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.deleteDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('sqldb client - deleteDatabase', that.standardHeaders);
    msRestRequest.DELETE(that.sqldbUrl, headers, API_VERSIONS.SQL, function (err, res, body) {
        if (err) {
            log.info('sqldb client: deleteDatabase: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Delete SQL database', true);

        if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
            log.info('sqldb client: deleteDatabase');
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
