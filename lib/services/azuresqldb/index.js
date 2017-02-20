/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind.js');
var cmdUnbind = require('./cmd-unbind.js');
var sqldbOperations = require('./client');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');
var common = require('../../common/');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['sqlServerName'] + '-' + params.parameters['sqldbName'];
};

Handlers.catalog = function (log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (log, params, next) {

  log.debug('SqlDb/index/provision/params: %j', params);
  
  var cp = new cmdProvision(log, params);
  log.info('sqldb index: cmdProvision is newed up');

  // add in the static data for the selected plan
  cp.fixupParameters();

  if (!cp.allValidatorsSucceed()) {
    return common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, 'Parameter validation failed. Please check your parameters.', next);
  }

  resourceGroupClient.initialize(params.azure, log);
  log.info('sqldb index: resourceGroupClient is initialized');

  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, { statusCode: HttpStatus.ACCEPTED, value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (log, params, next) {

  log.debug('sqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(log, params);
  log.info('sqldb index: cmdDeprovision is newed up');

  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cd.deprovision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, { statusCode: HttpStatus.OK, value: result }, null);
    }
  });
};

Handlers.poll = function (log, params, next) {

  log.debug('sqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(log, params);
  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.poll(sqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(log, err, function(error) {
        next(error, lastOperation);
      });
    } else if (result.statusCode === HttpStatus.OK) {
      next(null, lastOperation, { statusCode: HttpStatus.OK, value: result.value }, result.body);
    } else {
      next(null, lastOperation, { statusCode: result.statusCode, value: result.value }, result.body);
    }
  });


};

Handlers.bind = function (log, params, next) {

  log.debug('sqldb/index/bind/params: %j', params);

  var cp = new cmdBind(log, params);
  var sqldbOps = new sqldbOperations(log, params.azure);

  cp.bind(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      var provisioningResult = JSON.parse(params.provisioning_result);

      var fqdn = provisioningResult.fullyQualifiedDomainName;
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
                                provisioningResult.name,
                                result.databaseLogin,
                                result.databaseLoginPassword,
                                fqdn.replace(/.+\.database/, '*.database'));
      
      // Differences between auditing enabled and disabled: https://docs.microsoft.com/en-us/azure/sql-database/sql-database-auditing-and-dynamic-data-masking-downlevel-clients
      var jdbcUrlForAuditingEnabled = util.format(jdbcUrlTemplate,
                                fqdn.replace(/\.database/, '.database.secure'),
                                provisioningResult.name,
                                result.databaseLogin,
                                result.databaseLoginPassword,
                                fqdn.replace(/.+\.database/, '*.database.secure'));
                      
      // contents of reply.value winds up in VCAP_SERVICES
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            sqldbName: provisioningResult.name,
            sqlServerName: provisioningResult.sqlServerName,
            sqlServerFullyQualifiedDomainName: fqdn,
            databaseLogin: result.databaseLogin,
            databaseLoginPassword: result.databaseLoginPassword,
            jdbcUrl: jdbcUrl,
            jdbcUrlForAuditingEnabled: jdbcUrlForAuditingEnabled
          }
        }
      };

      next(null, reply, result);
    }
  });

};

Handlers.unbind = function (log, params, next) {

  log.debug('sqldb/index/unbind/params: %j', params);

  var cp = new cmdUnbind(log, params);
  var sqldbOps = new sqldbOperations(log, params.azure);

  cp.unbind(sqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(log, err, next);
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
