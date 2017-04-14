/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var HttpStatus = require('http-status-codes');

var Config = require('./service');
var common = require('../../common/');

var log = common.getLogger(Config.name);

var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind');
var docDbClient = require('./client');
var Reply = require('../../common/reply');


var Handlers = {};

Handlers.catalog = function(params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['docDbAccountName'];
};

Handlers.provision = function(params, next) {

  log.debug('DocDb/index/provision/params: %j', params);

  var cp = new cmdProvision(params);

  var errMsg = cp.verifyParameters();
  if (errMsg) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }

  docDbClient.initialize(params.azure);
  cp.provision(docDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.poll = function(params, next) {

  log.debug('DocDb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;

  var cp = new cmdPoll(params);

  docDbClient.initialize(params.azure);
  cp.poll(docDbClient, function(err, reply, provisioningResult) {
    if (err) {
      common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, reply, provisioningResult);
    }
  });
};

Handlers.deprovision = function(params, next) {

  log.debug('DocDb/index/deprovision/params: %j', params);

  var cp = new cmdDeprovision(params);

  docDbClient.initialize(params.azure);
  cp.deprovision(docDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.bind = function(params, next) {

  log.debug('DocDb/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;

  var cp = new cmdBind(params);

  docDbClient.initialize(params.azure);
  cp.bind(docDbClient, function(err, masterKey) {
    if (err) {
      common.handleServiceError(err, next);
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

Handlers.unbind = function(params, next) {

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

