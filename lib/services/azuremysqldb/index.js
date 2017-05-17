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
var mysqldbOperations = require('./client');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['mysqlServerName'];
};

Handlers.catalog = function (params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (params, next) {

  log.debug('MySqlDb/index/provision/params: %j', params);
  
  if (params.azure.environment === 'AzureChinaCloud') {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, 'Azure China Cloud doesn\'t support to create MySql DB for now.', next);
  }
  
  var cp = new cmdProvision(params);
  log.info('mysqldb index: cmdProvision is newed up');

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.provision(mysqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('mysqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('mysqldb index: cmdDeprovision is newed up');

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cd.deprovision(mysqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('mysqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.poll(mysqldbOps, function (err, result) {
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

  log.debug('mysqldb/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;
      
  var fqdn = provisioningResult.fullyQualifiedDomainName;
  // Spring Cloud Connector Support
  var jdbcUrlTemplate = 'jdbc:mysql://%s:3306;' + 
                        'database={your_database}' + 
                        '?verifyServerCertificate=true' +
                        '&useSSL=true' +
                        '&requireSSL=false';
      
  var jdbcUrl = util.format(jdbcUrlTemplate,
                            fqdn);
                      
  // contents of reply.value winds up in VCAP_SERVICES
  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        mysqlServerName: provisioningResult.mysqlServerName,
        mysqlServerFullyQualifiedDomainName: fqdn,
        administratorLogin: provisioningResult.administratorLogin,
        administratorLoginPassword: provisioningResult.administratorLoginPassword,
        jdbcUrl: jdbcUrl
      }
    }
  };
  next(null, reply, {});

};

Handlers.unbind = function (params, next) {

  log.debug('mysqldb/index/unbind/params: %j', params);
  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  next(null, reply, {});
};

module.exports = Handlers;
