/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common/');
<<<<<<< HEAD
var log = common.getLogger(Config.name);
=======
common.addLogger(Config.name, Config.name);
var log = require('winston').loggers.get(Config.name);
>>>>>>> 2d516c4aea40dfb009515bcaa5447c21ad0c0320
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind.js');
var cmdUnbind = require('./cmd-unbind.js');
var sqldbOperations = require('./client');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['sqlServerName'] + '-' + params.parameters['sqldbName'];
};

Handlers.catalog = function (params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (params, next) {

  log.debug('SqlDb/index/provision/params: %j', params);
  
  var cp = new cmdProvision(params);
  log.info('sqldb index: cmdProvision is newed up');

  // add in the static data for the selected plan
  cp.fixupParameters();

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.provision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.ACCEPTED, value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('sqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('sqldb index: cmdDeprovision is newed up');

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cd.deprovision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.OK, value: result }, null);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('sqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.poll(sqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else if (result.statusCode === HttpStatus.OK) {
      next(null, lastOperation, { statusCode: HttpStatus.OK, value: result.value }, result.body);
    } else {
      next(null, lastOperation, { statusCode: result.statusCode, value: result.value }, result.body);
    }
  });


};

Handlers.bind = function (params, next) {

  log.debug('sqldb/index/bind/params: %j', params);

  var cp = new cmdBind(params);
  var sqldbOps = new sqldbOperations(params.azure);

  cp.bind(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
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

Handlers.unbind = function (params, next) {

  log.debug('sqldb/index/unbind/params: %j', params);

  var cp = new cmdUnbind(params);
  var sqldbOps = new sqldbOperations(params.azure);

  cp.unbind(sqldbOps, function (err, result) {
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
