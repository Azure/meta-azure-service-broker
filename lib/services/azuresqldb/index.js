/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var sqldbOperations = require('./client');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['sqlServerName'] + '-' + params.parameters['sqldbName'];
};

Handlers.catalog = function (log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (log, params, next) {

  log.info('SqlDb/index/provision/params: %j', params);
  
  var cp = new cmdProvision(log, params);
  log.info('sqldb index: cmdProvision is newed up');

  // add in the static data for the selected plan
  cp.fixupParameters();

  if (!cp.allValidatorsSucceed()) {
    var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR);
    reply.value.description = 'Input validators failed.';
    var err = new Error('Parameter validation failed.  Did you supply the parameters file?');
    err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    next(err, reply, null);
    return;
  }

  resourceGroupClient.instantiate(params.azure, log);
  log.info('sqldb index: resourceGroupClient is instantiated');

  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
    if (err) {
      var statusCode = null;
      if (_.has(err, 'statusCode')) statusCode = err.statusCode;
      var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR, statusCode, err.code);
      if (reply.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      next(err, reply, result);
    } else {
      next(null, { statusCode: HttpStatus.ACCEPTED, value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (log, params, next) {

  log.info('sqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(log, params);
  log.info('sqldb index: cmdDeprovision is newed up');

  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cd.deprovision(sqldbOps, function (err, result) {
    if (err) {
      var statusCode = null;
      if (_.has(err, 'statusCode')) statusCode = err.statusCode;
      var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR, statusCode, err.code);
      if (reply.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      next(err, reply, result);
    } else {
      next(null, { statusCode: HttpStatus.OK, value: result.value }, null);
    }
  });
};

Handlers.poll = function (log, params, next) {

  log.info('sqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(log, params);
  var sqldbOps = new sqldbOperations(log, params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.poll(sqldbOps, function (err, result) {
    if (err) {
      var statusCode = null;
      if (_.has(err, 'statusCode')) statusCode = err.statusCode;
      var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR, statusCode, err.code);
      if (reply.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      next(err, lastOperation, reply, null);
    } else if (result.statusCode === HttpStatus.OK) {
      next(null, lastOperation, { statusCode: HttpStatus.OK, value: result.value }, result.body);
    } else {
      next(null, lastOperation, { statusCode: result.statusCode, value: result.value }, null);
    }
  });


};

Handlers.bind = function (log, params, next) {

  log.info('sqldb/index/bind/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  // contents of reply.value winds up in VCAP_SERVICES
  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        sqldbName: provisioningResult.name,
        sqlServerName: provisioningResult.sqlServerName,
        administratorLogin: provisioningResult.administratorLogin,
        administratorLoginPassword: provisioningResult.administratorLoginPassword
      }
    }
  };

  next(null, reply, {});

};

Handlers.unbind = function (log, params, next) {

  log.info('sqldb/index/unbind/params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  next(null, reply, {});
};

module.exports = Handlers;
