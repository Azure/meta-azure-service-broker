/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var cmdPoll = require('./cmd-poll');
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdBind = require('./cmd-bind');
var redisClient = require('./client');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');
var common = require('../../common/');

var Handlers = {};

Handlers.catalog = function (log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['cacheName'];
};

Handlers.provision = function (log, params, next) {

  log.debug('Redis Cache/index/provision/params: %j', params);

  var cp = new cmdProvision(log, params);
  if (!cp.allValidatorsSucceed()) {
    return common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, 'Parameter validation failed. Did you supply a redis cache parameters file?', next);
  }

  resourceGroupClient.initialize(params.azure, log);
  redisClient.initialize(params.azure, log);
  cp.provision(redisClient, resourceGroupClient, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.poll = function (log, params, next) {

  log.debug('Redis Cache/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdPoll(log, params);

  redisClient.initialize(params.azure, log);
  cp.poll(redisClient, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, result, provisioningResult);
    }
  });
};

Handlers.deprovision = function (log, params, next) {

  log.debug('Redis Cache/index/deprovision/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdDeprovision(log, params);

  redisClient.initialize(params.azure, log);
  cp.deprovision(redisClient, function (err, result) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.bind = function (log, params, next) {

  log.debug('Redis Cache/index/bind/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);

  var cp = new cmdBind(log, params);

  redisClient.initialize(params.azure, log);
  cp.bind(redisClient, function(err, accessKeys) {
    if (err) {
      common.handleServiceError(log, err, next);
    } else {
      // contents of reply.value winds up in VCAP_SERVICES
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            name: provisioningResult.name,
            hostname: provisioningResult.hostName,
            port: provisioningResult.port,
            sslPort: provisioningResult.sslPort,
            primaryKey: accessKeys.primaryKey,
            secondaryKey: accessKeys.secondaryKey
          }
        }
      };

      next(null, reply, {});
    }
  });
};

Handlers.unbind = function (log, params, next) {

  log.debug('Redis Cache/index/unbind/params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  var result = {};
  next(null, reply, result);
};

module.exports = Handlers;
