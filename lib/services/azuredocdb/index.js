/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var Config = require('./service');
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind');
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
  return Config.name + '-' + params.parameters['docDbAccountName'];
};

Handlers.provision = function(log, params, next) {

  log.debug('DocDb/index/provision/params: %j', params);

  var cp = new cmdProvision(log, params);

  var errMsg = cp.verifyParameters();
  if (errMsg) {
    return common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, errMsg, next);
  }

  resourceGroupClient.initialize(params.azure, log);
  docDbClient.initialize(params.azure, log);
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

  var cp = new cmdPoll(log, params);

  docDbClient.initialize(params.azure, log);
  cp.poll(docDbClient, function(err, reply, provisioningResult) {
    if (err) {
      common.handleServiceError(log, err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, reply, provisioningResult);
    }
  });
};

Handlers.deprovision = function(log, params, next) {

  log.debug('DocDb/index/deprovision/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdDeprovision(log, params);

  docDbClient.initialize(params.azure, log);
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

  var cp = new cmdBind(log, params);

  docDbClient.initialize(params.azure, log);
  cp.bind(docDbClient, function(err, masterKey) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            documentdb_host_endpoint: provisioningResult.documentEndpoint,
            documentdb_master_key: masterKey,
            documentdb_database_id: provisioningResult.database.id,
            documentdb_database_link: provisioningResult.database._self
          }
        }
      };
      next(null, reply, {});
    }
  });
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

