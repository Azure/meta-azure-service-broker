/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var HttpStatus = require('http-status-codes');
var common = require('../../common/');
var Config = require('./service');
var log = common.getLogger(Config.name);
var cmdPoll = require('./cmd-poll');
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdBind = require('./cmd-bind');
var redisClient = require('./client');
var Reply = require('../../common/reply');

var Handlers = {};

Handlers.catalog = function (params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['cacheName'];
};

Handlers.provision = function (params, next) {

  log.debug('Redis Cache/index/provision/params: %j', params);

  var cp = new cmdProvision(params);
  if (!cp.allValidatorsSucceed()) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, 'Parameter validation failed. Did you supply a redis cache parameters file?', next);
  }

  redisClient.initialize(params.azure);
  cp.provision(redisClient, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('Redis Cache/index/poll/params: %j', params);

  var lastOperation = params.last_operation;

  var cp = new cmdPoll(params);

  redisClient.initialize(params.azure);
  cp.poll(redisClient, function (err, reply, result) {
    if (err) {
      common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, reply, result);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('Redis Cache/index/deprovision/params: %j', params);

  var cp = new cmdDeprovision(params);

  redisClient.initialize(params.azure);
  cp.deprovision(redisClient, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.bind = function (params, next) {

  log.debug('Redis Cache/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;

  var cp = new cmdBind(params);

  redisClient.initialize(params.azure);
  cp.bind(redisClient, function(err, accessKeys) {
    if (err) {
      common.handleServiceError(err, next);
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

Handlers.unbind = function (params, next) {

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
