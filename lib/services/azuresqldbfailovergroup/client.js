/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var sqlDb = require('mssql');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var sqldbfgOperations = function (azure) {
  this.azure = azure;

  var environmentName = azure.environment;
  var environment = common.getEnvironment(environmentName);
  this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

  API_VERSIONS = common.API_VERSION[environmentName];

  log.info('client CTOR');

};

sqldbfgOperations.prototype.setParameters = function (
  primaryResourceGroupName,
  primaryServerName,
  primaryDbName,
  secondaryResourceGroupName,
  secondaryServerName,
  failoverGroupName) {
    this.primaryServerUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
      this.resourceManagerEndpointUrl,
      this.azure.subscriptionId,
      primaryResourceGroupName,
      primaryServerName);
    this.primaryDbUrl = util.format('%s/databases/%s', this.primaryServerUrl, primaryDbName);
    this.secondaryServerUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
      this.resourceManagerEndpointUrl,
      this.azure.subscriptionId,
      secondaryResourceGroupName,
      secondaryServerName);
    this.secondaryDbUrl = util.format('%s/databases/%s', this.secondaryServerUrl, primaryDbName);
    this.failoverGroupUrl = util.format('%s/failoverGroups/%s', this.primaryServerUrl, failoverGroupName);

    this.dbName = primaryDbName;

    this.standardHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json'
    };

};

sqldbfgOperations.prototype.checkComplete = function (url, callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('client - checkComplete', that.standardHeaders);
    msRestRequest.GET(url, headers, API_VERSIONS.SQLFG, function (err, res, body) {
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

function getDbConnectionConfig(serverDomainName, adminLogin, adminLoginPassword, dbName) {
  return {
    'server': serverDomainName,
    'user': adminLogin,
    'password': adminLoginPassword,
    'database': dbName,
    'options': {
      'encrypt': true
    }
  };
}

sqldbfgOperations.prototype.executeSqls = function (config, sqls, callback) {
  log.info('client: connecting to database %s in server %s ...', config.database, config.server);
  var conn = sqlDb.connect(config, function(err) {
    if (err) {
      log.error('client: connect to server: err %j', err);
      return callback(err);
    }

    log.info('client: connect to database %s in server %s: succeed.', config.database, config.server);

    var n = sqls.length;
    var i = 0;
    async.whilst(
      function() {
        return i < n;
      },
      function(cb) {
        log.info('client: it is going to execute sql: %s', sqls[i]);
        var req = new sqlDb.Request(conn);
        req.query(sqls[i], function(err) {
          if (err) {
            return cb(err);
          }

          log.info('client: executed sql: %s', sqls[i]);
          i++;
          cb(null);
        });
      },
      function(err) {
        conn.close();
        callback(err);
      }
    );
  });
};

sqldbfgOperations.prototype.createDatabaseUser = function (serverDomainName, adminLogin, adminLoginPassword, databaseUser, databaseUserPassword, callback) {
  var that = this;
  var config = getDbConnectionConfig(serverDomainName, adminLogin, adminLoginPassword, that.dbName);
  var sql = util.format('CREATE USER "%s" WITH PASSWORD=\'%s\'', databaseUser, databaseUserPassword);
  that.executeSqls(config, [sql], callback);
};

sqldbfgOperations.prototype.dropDatabaseUser = function (serverDomainName, adminLogin, adminLoginPassword, databaseUser, callback) {
  var that = this;
  var config = getDbConnectionConfig(serverDomainName, adminLogin, adminLoginPassword, that.dbName);
  var sql = util.format('DROP USER "%s"', databaseUser);
  that.executeSqls(config, [sql], callback);
};

sqldbfgOperations.prototype.alterRolesToUser = function (serverDomainName, adminLogin, adminLoginPassword, databaseUser, roles, callback) {
  var that = this;
  var config = getDbConnectionConfig(serverDomainName, adminLogin, adminLoginPassword, that.dbName);
  var sqls = [];
  roles.forEach(function(role){
    sqls.push(util.format('ALTER ROLE %s ADD MEMBER "%s"', role, databaseUser));
  });
  that.executeSqls(config, sqls, callback);
};

sqldbfgOperations.prototype.grantPermissionsToUser = function (serverDomainName, adminLogin, adminLoginPassword, databaseUser, permissions, callback) {
  var that = this;
  var config = getDbConnectionConfig(serverDomainName, adminLogin, adminLoginPassword, that.dbName);
  var sqls = [];
  permissions.forEach(function(permission){
    sqls.push(util.format('GRANT %s TO "%s"', permission, databaseUser));
  });
  that.executeSqls(config, sqls, callback);
};

sqldbfgOperations.prototype.getResource = function getResource(name, url, callback) {
  var that = this;

  var headers = common.mergeCommonHeaders(util.format('client - get%s', name), that.standardHeaders);
  msRestRequest.GET(url, headers, API_VERSIONS.SQLFG, function (err, res, body) {
    if (err) {
      log.info('client: get%s: err %j', name, err);
      return callback(err, null);
    }

    common.logHttpResponse(res, util.format('client - get%s', name), true);

    var result = {};
    result.statusCode = res.statusCode;
    if (res.statusCode === HttpStatus.OK) {
      result.body = JSON.parse(body);
    }

    callback(null, result);
  });

};

sqldbfgOperations.prototype.getPrimaryServer = function (callback) {
  var that = this;
  that.getResource('PrimaryServer', that.primaryServerUrl, callback);
};

sqldbfgOperations.prototype.getSecondaryServer = function (callback) {
  var that = this;
  that.getResource('SecondaryServer', that.secondaryServerUrl, callback);
};

sqldbfgOperations.prototype.getPrimaryDb = function (callback) {
  var that = this;
  that.getResource('PrimaryDb', that.primaryDbUrl, callback);
};

sqldbfgOperations.prototype.getFailoverGroup = function (callback) {
  var that = this;
  that.getResource('FailoverGroup', that.failoverGroupUrl, callback);
};

sqldbfgOperations.prototype.createFailoverGroup = function (readWriteEndpoint, callback) {
  var that = this;

  var body = {
    'properties': {
      'readWriteEndpoint': readWriteEndpoint,
      'readOnlyEndpoint': {
        'failoverPolicy': 'Disabled'
      },
      'partnerServers': [
        {
          'id': that.secondaryServerUrl.replace(that.resourceManagerEndpointUrl, '')
        }
      ],
      'databases': [
        that.primaryDbUrl.replace(that.resourceManagerEndpointUrl, '')
      ]
    },
    'tags': common.mergeTags({})
  };

  var headers = common.mergeCommonHeaders('client - createFailoverGroup', that.standardHeaders);
  msRestRequest.PUT(that.failoverGroupUrl, headers, body, API_VERSIONS.SQLFG, function (err, res, body) {
    if (err) {
      log.info('client: createFailoverGroup: err %j', err);
      return callback(err, null);
    }

    common.logHttpResponse(res, 'client - createFailoverGroup', true);

    if (res.statusCode == HttpStatus.ACCEPTED) {
      callback(null, res['headers']['azure-asyncoperation']);
    } else if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
      callback(null);
    } else {
      return common.formatErrorFromRes(res, callback);
    }
  });

};

sqldbfgOperations.prototype.deleteFailoverGroup = function (callback) {
  var that = this;

  var headers = common.mergeCommonHeaders('client - deleteFailoverGroup', that.standardHeaders);
  msRestRequest.DELETE(that.failoverGroupUrl, headers, API_VERSIONS.SQLFG, function (err, res, body) {
    if (err) {
      log.error('client: deleteFailoverGroup: err %j', err);
      return callback(err);
    }

    common.logHttpResponse(res, 'client - deleteFailoverGroup', true);

    if (res.statusCode == HttpStatus.ACCEPTED) {
      callback(null, res['headers']['azure-asyncoperation']);
    } else if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
      callback(null);
    } else {
      return common.formatErrorFromRes(res, callback);
    }
  });
};

sqldbfgOperations.prototype.deleteSecondaryDb = function (callback) {
  var that = this;

  var headers = common.mergeCommonHeaders('client - deleteSecondaryDb', that.standardHeaders);
  msRestRequest.DELETE(that.secondaryDbUrl, headers, API_VERSIONS.SQLFG, function (err, res, body) {
    if (err) {
      log.error('client: deleteSecondaryDb: err %j', err);
      return callback(err);
    }

    common.logHttpResponse(res, 'client - deleteSecondaryDb', true);

    if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
      callback(null);
    } else {
      return common.formatErrorFromRes(res, callback);
    }
  });
};

sqldbfgOperations.prototype.validateFailoverGroup = function (partnerServers, databases) {
  var that = this;
  /* see example in: https://docs.microsoft.com/en-us/rest/api/sql/failovergroups/get
    'partnerServers': [
      {
        'id': '/subscriptions/00000000-1111-2222-3333-444444444444/resourceGroups/Default/providers/Microsoft.Sql/servers/failover-group-secondary-server',
        'location': 'Japan West',
        'replicationRole': 'Secondary'
      }
    ],
    'databases': [
      '/subscriptions/00000000-1111-2222-3333-444444444444/resourceGroups/Default/providers/Microsoft.Sql/servers/failover-group-primary-server/databases/testdb-1',
      '/subscriptions/00000000-1111-2222-3333-444444444444/resourceGroups/Default/providers/Microsoft.Sql/servers/failover-group-primary-server/databases/testdb-2'
    ]
  */
  var checkSecondaryServer = false;
  var expectedSecondaryServerUrl = that.secondaryServerUrl.replace(that.resourceManagerEndpointUrl, '');
  partnerServers.forEach(function(i){
    if (i.id === expectedSecondaryServerUrl && i.replicationRole === 'Secondary') checkSecondaryServer = true;
  });
  var checkPrimaryDb = false;
  var expectedPrimaryDbUrl = that.primaryDbUrl.replace(that.resourceManagerEndpointUrl, '');
  databases.forEach(function(i){
    if (i === expectedPrimaryDbUrl) checkPrimaryDb = true;
  });
  return checkSecondaryServer && checkPrimaryDb;
};

module.exports = sqldbfgOperations;
