/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common/');
var log = common.getLogger(Config.name);
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind');
var cmdUnbind = require('./cmd-unbind');
var sqldbfgOperations = require('./client');
var uuid = require('uuid');

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_SQLDB_FAILOVER_GROUP', parameters);
  return parameters;
};

Handlers.generateAzureInstanceId = function(params) {
  if (params.plan_id === '5a75ffc1-555d-4193-b60b-eb464069f913') { // registered failover group doesn't care about the conflict
    return Config.name + '-' + uuid.v4();
  }
  return Config.name + '-' + params.parameters['failoverGroupName'];
};

Handlers.catalog = function (params, next) {
  var availableEnvironments = ['AzureCloud', 'AzureGermanCloud', 'AzureChinaCloud', 'AzureUSGovernment'];
  if (availableEnvironments.indexOf(params.azure.environment) === -1) {
    return next(null);
  }

  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (params, next) {

  log.debug('index/provision/params: %j', params);

  var cp = new cmdProvision(params);
  log.info('sqldbfg index: cmdProvision is newed up');

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var sqldbfgOps = new sqldbfgOperations(params.azure);
  log.info('sqldbfg index: sqldbfgOps is newed up');

  cp.provision(sqldbfgOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('sqldbfg index: cmdDeprovision is newed up');

  var sqldbfgOps = new sqldbfgOperations(params.azure);
  log.info('sqldbfg index: sqldbfgOps is newed up');

  cd.deprovision(sqldbfgOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var sqldbfgOps = new sqldbfgOperations(params.azure);
  log.info('sqldbfg index: sqldbfgOps is newed up');

  cp.poll(sqldbfgOps, function (err, result) {
    if (err) {
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, { value: result.value }, result.body);
    }
  });
};

Handlers.bind = function (params, next) {

  log.debug('index/bind/params: %j', params);

  var cb = new cmdBind(params);
  var sqldbfgOps = new sqldbfgOperations(params.azure);

  cb.bind(sqldbfgOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      var reqParams = params.parameters;
      var provisioningResult = params.provisioning_result;
      var sqldbName = reqParams.primaryDbName;
      var sqlServerName = reqParams.failoverGroupName;
      var databaseUser = result.databaseUser;
      var databaseUserPassword = result.databaseUserPassword;
      // encode the URI components that can contain reserved "delimiter" characters
      // see: https://tools.ietf.org/html/rfc3986#section-2.2
      var encodedUser = encodeURIComponent(databaseUser);
      var encodedUserPassword = encodeURIComponent(databaseUserPassword);
      var fqdn = provisioningResult.primaryFQDN.replace(/\w+/, reqParams.failoverGroupName);

      // Spring Cloud Connector Support
      var jdbcUrlTemplate = 'jdbc:sqlserver://%s:1433;' +
                            'database=%s;' +
                            'user=%s;' +
                            'password=%s;' +
                            'Encrypt=true;' +
                            'TrustServerCertificate=false;' +
                            'HostNameInCertificate=%s;' +
                            'loginTimeout=30;';

      var jdbcUrl = util.format(jdbcUrlTemplate,
                                fqdn,
                                sqldbName,
                                databaseUser,
                                databaseUserPassword,
                                fqdn.replace(/.+\.database/, '*.database'));

      // Differences between auditing enabled and disabled: https://docs.microsoft.com/en-us/azure/sql-database/sql-database-auditing-and-dynamic-data-masking-downlevel-clients
      var jdbcUrlForAuditingEnabled = util.format(jdbcUrlTemplate,
                                                  fqdn.replace(/\.database/, '.database.secure'),
                                                  sqldbName,
                                                  databaseUser,
                                                  databaseUserPassword,
                                                  fqdn.replace(/.+\.database/, '*.database.secure'));

      var uri = util.format('mssql://%s:%s@%s:1433/%s?encrypt=true&TrustServerCertificate=false&HostNameInCertificate=%s',
                            encodedUser,
                            encodedUserPassword,
                            fqdn,
                            sqldbName,
                            fqdn.replace(/.+\.database/, '%2A.database'));

      // contents of reply.value winds up in VCAP_SERVICES
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            sqldbName: sqldbName,
            sqlServerName: sqlServerName,
            sqlServerFullyQualifiedDomainName: fqdn,
            databaseLogin: databaseUser,
            databaseLoginPassword: databaseUserPassword,
            jdbcUrl: jdbcUrl,
            jdbcUrlForAuditingEnabled: jdbcUrlForAuditingEnabled,
            hostname: fqdn,
            port: 1433,
            name: sqldbName,
            username: databaseUser,
            password: databaseUserPassword,
            uri: uri
          }
        }
      };

      next(null, reply, result);
    }
  });

};

Handlers.unbind = function (params, next) {

  log.debug('index/unbind/params: %j', params);

  var cu = new cmdUnbind(params);
  var sqldbfgOps = new sqldbfgOperations(params.azure);

  cu.unbind(sqldbfgOps, function (err) {
    if (err) {
      return common.handleServiceError(err, next);
    }
    var reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: {},
    };
    next(null, reply, {});
  });
};

module.exports = Handlers;
