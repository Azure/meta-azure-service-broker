/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var Config = require('./service');
var cmdPoll = require('./cmd-poll');
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var docDbClient = require('./client');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');
var common = require('../../common/');

var Handlers = {};

Handlers.catalog = function(log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + process.env['DOCDB_HOSTENDPOINT'].match(/^https\:\/\/([^\.]*)\..*$/)[1] + '-' + params.parameters['docDbName'];
};

Handlers.provision = function(log, params, next) {

  log.debug('DocDb/index/provision/params: %j', params);

  var cp = new cmdProvision(log, params);

  if (!cp.allValidatorsSucceed()) {
    common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, 'Parameter validation failed. Did you supply a DocDb parameters file?', next);
    return;
  }

  resourceGroupClient.instantiate(params.azure, log);
  docDbClient.instantiate(log);
  cp.provision(docDbClient, resourceGroupClient, function(err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.poll = function(log, params, next) {

  log.debug('DocDb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdPoll(log, params);
  if (!cp.allValidatorsSucceed()) {
    common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, 'Parameter validation failed.', next);
    return;
  }

  docDbClient.instantiate(log);
  cp.poll(docDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(log, err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, result, provisioningResult);
    }
  });
};

Handlers.deprovision = function(log, params, next) {

  log.debug('DocDb/index/deprovision/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdDeprovision(log, params);
  if (!cp.allValidatorsSucceed()) {
    common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, 'Parameter validation failed.', next);
    return;
  }

  docDbClient.instantiate(params.azure, log);
  cp.deprovision(docDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.bind = function(log, params, next) {

  log.debug('DocDb/index/bind/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        documentdb_host: process.env['DOCDB_HOSTENDPOINT'],
        documentdb_key: process.env['DOCDB_MASTERKEY'],
        documentdb_database: provisioningResult.id,
        documentdb_resource_id: provisioningResult._self
      }
    }
  };
  next(null, reply, {});
};

Handlers.unbind = function(log, params, next) {

  log.debug('DocDb/index/unbind/params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  var result = {};
  next(null, reply, result);
};

module.exports = Handlers;
