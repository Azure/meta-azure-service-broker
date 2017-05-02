/*jshint camelcase: false */

/********************************/
/* Broker V2 API HTTP handlers */
/********************************/
'use strict';

var util = require('util');
var async = require('async');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var common = require('../../common');

var log = common.getLogger(common.LOG_CONSTANTS.BROKER);

var config = common.getConfigurations();
var credentialsAndSubscriptionId = config.azure;
var privilege = config.privilege;
var accountPool = config.accountPool;
var defaultSettings = config.defaultSettings;

var Handlers = {};

var emitEvent = function(broker, operation, params, processResponse, next) {
  var serviceId = params.service_id;
  var event = util.format('%s-%s', operation, serviceId);

  if (broker.listeners(event).length > 0) {
    log.info('Emitting event (%s) for (instanceId: %s).', event, params.instance_id);
    broker.emit(event, params, processResponse);
  } else {
    var errMsg = util.format('%s is not implemented for the service %s in this broker.', operation, serviceId);
    return common.handleServiceErrorEx(HttpStatus.NOT_IMPLEMENTED, errMsg, next);
  }
};

/**
 * This is authentication middleware supplied to restify by the broker.
 * @param {object} log the log handler
 * @param {object} credentials the authentication credential object
 */
Handlers.authenticate = function(credentials) {
  return function(req, res, next) {
    if (req.authorization.basic) {
      if (req.authorization.basic.username === credentials.authUser &&
        req.authorization.basic.password === credentials.authPassword) {
        return next();
      }
    }

    log.error('Invalid auth credentials for requests.');
    res.send(HttpStatus.UNAUTHORIZED, {});
    return next();
  };
};

/**
 * Returns a complete service catalog listing to the CC.
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 */
Handlers.handleCatalogRequest = function(broker, req, res, next) {
  log.info('handleCatalogRequest - %s:%s', req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(reply) {
    res.send(reply);
    log.info('handleCatalogRequest - Succeeded in sending the catalog response to cc.');
    return next();
  };

  if (broker.listeners('catalog').length > 0) {
    broker.emit('catalog', processResponse);
  } else {
    log.error('handleCatalogRequest - No listeners attached for the "catalog" event');
    return common.handleServiceErrorEx(HttpStatus.NOT_IMPLEMENTED, 'Catalog is not implemented in this broker. ' + req.params.version, next);
  }
};

/**
 * Handles new service provisioning requests
 *
 * @this {RestifyServer}
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 */
Handlers.handleProvisionRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handleProvisionRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  // Check whether the request is asynchronous.
  var accepts_incomplete = req.params.accepts_incomplete;
  if (typeof(accepts_incomplete) == 'undefined' || accepts_incomplete == 'false') {
    var msg = 'This service plan requires client support for asynchronous service operations.';
    log.warn('handleProvisionRequest - %s', msg);
    var body = {
      error: 'AsyncRequired',
      description: msg
    };
    res.send(HttpStatus.UNPROCESSABLE_ENTITY, body);
    return next();
  }

  // Generate Azure instance id from the matched service module
  // Format: [SERVICE-MODULE-NAME]-[UNIQUE-SERVICE-INSTANCE-NAME]
  var azureInstanceId = global.modules[req.params.service_id].generateAzureInstanceId(req.params);
  req.params.azureInstanceId = azureInstanceId;
  log.info('handleProvisionRequest - Processing provision request for (azureInstanceId: %s)', azureInstanceId);

  var processResponse = function(error, reply, result) {
    if (error) {
      log.error('handleProvisionRequest - Failed in sending provision request for (instanceId: %s) to Azure. Provision Error: %j', instanceId, error);
      // Need to delete the inserted record from broker database
      broker.db.deleteServiceInstance(instanceId, function(err){
        if (err) {
          // CC will call deprovision
          log.error('handleProvisionRequest - %j', err);
          res.send(err.statusCode, err);
          return next();
        }

        res.send(error.statusCode, error);
        log.info('handleProvisionRequest - Succeeded in sending the provision error response for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    } else {
      log.info('handleProvisionRequest - Succeeded in sending provision request for (instanceId: %s) to Azure.', instanceId);
      // Need to update result in the inserted record in broker database
      broker.db.updateServiceInstanceProvisioningPendingResult(instanceId, JSON.stringify(result), function(err){
        if (err) {
          // CC will call deprovision
          log.error('handleProvisionRequest - %j', err);
          res.send(err.statusCode, err);
          return next();
        }

        body = reply.value;
        res.send(HttpStatus.ACCEPTED, body);
        log.info('handleProvisionRequest - Succeeded in sending the provision response for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    }
  };

  // Insert a record with (status:pending, lastOperation: provision) into broker database
  broker.db.createServiceInstance(req.params, function(err){
    if (err) {
      // It fails when a record with the same azureInstanceId exists in broker database
      if (err.statusCode == HttpStatus.CONFLICT) {
        log.error('handleProvisionRequest - %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      log.error('handleProvisionRequest - %j', err);
      res.send(err.statusCode, err);
      return next();
    }

    // Call module service to do provisioning
    var operation = 'provision';
    var params = req.params;
    params.azure = credentialsAndSubscriptionId;
    params.privilege = privilege;
    params.accountPool = accountPool;
    emitEvent(broker, operation, params, processResponse, next);
  });
};

/**
 * Handles new service provision polling requests
 *
 * @this {RestifyServer}
 * @param {Object} error returned by service module
 * @param {Object} reply returned by service module
 * @param {Object} result returned by service module
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 *
 * http://docs.cloudfoundry.org/services/api.html#polling
 */
var handleProvisionPollResponse = function(error, reply, result, broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handleProvisionPollResponse - (instanceId: %s)', instanceId);

  if (error) {
    log.error('handleProvisionPollResponse - Failed in polling the status for (instanceId: %s). Error: %j', instanceId, error);
    broker.db.deleteServiceInstance(instanceId, function(err){
      if (err) {
        // CC will continue polling until the broker returns a valid response (200 OK) or the maximum polling duration is reached
        log.error('handleProvisionPollResponse - db.deleteServiceInstance: %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      var responseBody = {
        'state': 'failed',
        'description': util.format('%j', error)
      };
      res.send(HttpStatus.OK, responseBody);
      log.info('handleProvisionPollResponse - Succeeded in sending the poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
      return next();
    });
  } else if (reply.value.state == 'succeeded') {
    log.info('handleProvisionPollResponse - Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    broker.db.updateServiceInstanceProvisioningSuccessResult(instanceId, JSON.stringify(result), function(err){
      if (err) {
        // CC will continue polling until the broker returns a valid response (200 OK) or the maximum polling duration is reached
        log.error('handleProvisionPollResponse - db.updateServiceInstanceProvisioningSuccessResult: %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      var responseBody = {
        'state': 'succeeded',
        'description': reply.value.description
      };
      res.send(HttpStatus.OK, responseBody);
      log.info('handleProvisionPollResponse - Succeeded in sending the poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
      return next();
    });
  } else {
    log.info('handleProvisionPollResponse - Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    broker.db.updateServiceInstanceProvisioningPendingResult(instanceId, JSON.stringify(result), function(err){
      if (err) {
        // CC will continue polling until the broker returns a valid response (200 OK) or the maximum polling duration is reached
        log.error('handleProvisionPollResponse - db.updateServiceInstanceProvisioningPendingResult: %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      var responseBody = {
        'state': 'in progress',
        'description': reply.value.description
      };
      res.send(HttpStatus.OK, responseBody);
      log.info('handleProvisionPollResponse - Succeeded in sending the poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
      return next();
    });
  }
};

/**
 * Handles new service deprovision polling requests
 *
 * @this {RestifyServer}
 * @param {Object} error returned by service module
 * @param {Object} reply returned by service module
 * @param {Object} result returned by service module
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 */
var handleDeProvisionPollResponse = function(error, reply, result, broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handleDeProvisionPollResponse - (instanceId: %s)', instanceId);

  if (error) {
    log.error('handleDeProvisionPollResponse: Failed in polling the status for (instanceId: %s). Error: %j', instanceId, error);
    if (error.statusCode == HttpStatus.NOT_FOUND) {
      broker.db.deleteServiceInstance(instanceId, function(err){
        if (err) {
          log.error('handleDeProvisionPollResponse - db.deleteServiceInstance: %j', err);
          res.send(err.statusCode, err);
          return next();
        }
        res.send(HttpStatus.GONE, {});
        log.info('handleDeProvisionPollResponse: Succeeded in sending the poll response GONE for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    } else {
      var responseBody = {
        'state': 'failed',
        'description': util.format('%j', error)
      };
      res.send(HttpStatus.OK, responseBody);
      log.info('handleDeProvisionPollResponse: Succeeded in sending the deprovision poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
      return next();
    }
  } else if (reply.value.state == 'succeeded') {
    log.info('handleDeProvisionPollResponse: Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    broker.db.deleteServiceInstance(instanceId, function(err){
      if (err) {
        log.error('handleDeProvisionPollResponse - db.deleteServiceInstance: %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      var responseBody = {
        'state': 'succeeded',
        'description': reply.value.description
      };
      res.send(HttpStatus.OK, responseBody);
      log.info('handleDeProvisionPollResponse: Succeeded in sending the deprovision poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
      return next();
    });
  } else {
    log.info('handleDeProvisionPollResponse: Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    var responseBody = {
      'state': 'in progress',
      'description': reply.value.description
    };
    res.send(HttpStatus.OK, responseBody);
    log.info('handleDeProvisionPollResponse: Succeeded in sending the deprovision poll response for (instanceId: %s) to cc. State: %j', instanceId, responseBody);
    return next();
  }
};

/**
 * Handles new service polling requests
 *
 * @this {RestifyServer}
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 */
Handlers.handlePollRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handlePollRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, lastOperation, reply, result) {
    if (lastOperation == 'provision') {
      return handleProvisionPollResponse(error, reply, result, broker, req, res, next);
    } else {
      return handleDeProvisionPollResponse(error, reply, result, broker, req, res, next);
    }
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      log.error('handlePollRequest - %j', err);
      res.send(err.statusCode, err);
      return next();
    }
    if (_.isEmpty(serviceInstance)) {
      res.send(HttpStatus.GONE, {});
      log.info('handlePollRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next();
    }

    var operation = 'poll';
    var params = serviceInstance;
    params.azure = credentialsAndSubscriptionId;
    params.defaultSettings = defaultSettings;
    emitEvent(broker, operation, params, processResponse, next);
  });
};

/**
 * Handles service deprovisioning requests
 *
 * The Cloud Controller expects only a 200 OK response and nothing in
 * the response body is interpreted by it.
 *
 * @this {RestifyServer}
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} next restify's next() handler
 */
Handlers.handleDeProvisionRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handleDeProvisionRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      log.error('handleDeProvisionRequest - %j', err);
      res.send(err.statusCode, err);
      return next();
    }
    if (_.isEmpty(serviceInstance)) {
      res.send(HttpStatus.GONE, {});
      log.info('handleDeProvisionRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next();
    }

    var operation = 'deprovision';
    var params = req.params;
    params.provisioning_result = serviceInstance.provisioning_result;
    params.azure = credentialsAndSubscriptionId;
    var processResponse = function(error, reply, result) {
      if (error) {
        log.error('handleDeProvisionRequest - Failed in sending deprovision request for (instanceId: %s) to Azure. Deprovision Error: %j', instanceId, error);
        res.send(error.statusCode, error);

        log.info('handleDeProvisionRequest - Succeeded in sending the deprovision error response for (instanceId: %s) to cc.', instanceId);
        return next();
      }

      var status = serviceInstance['status'];
      if (status == 'success') {
        log.info('handleDeProvisionRequest - The status of the service instance %s is "success". Updating the lastOperation to "deprovision" in db.', instanceId);
        broker.db.updateServiceInstanceLastOperation(instanceId, 'deprovision', function(err){
          if (err) {
            log.error('handleDeProvisionRequest - %j', err);
            res.send(err.statusCode, err);
            return next();
          }

          res.send(HttpStatus.ACCEPTED, reply.value);
          log.info('handleDeProvisionRequest - Succeeded in sending the deprovision response for (instanceId: %s) to cc.', instanceId);
          return next();
        });
      } else {
        // When the provisioning operation times out, CC will call deprovisioning to delete the orphan instance on Azure. We need to delete the service instance information in the database.
        log.warn('handleDeProvisionRequest - The status of the service instance %s is %s. The provisioning operation may have timed out. Try to delete the service instance information in db', instanceId, status);
        broker.db.deleteServiceInstance(instanceId, function(err){
          if (err) {
            log.error('handleDeProvisionRequest - db.deleteServiceInstance: %j', err);
            res.send(err.statusCode, err);
            return next();
          }

          res.send(HttpStatus.ACCEPTED, reply.value);
          log.info('handleDeProvisionRequest - Succeeded in sending the deprovision response for (instanceId: %s) to cc.', instanceId);
          return next();
        });
      }
    };
    emitEvent(broker, operation, params, processResponse, next);
  });
};

/**
 * handles new service binding requests
 *
 * @this {restifyserver}
 * @param {BrokerV2} broker the broker instance
 * @param {object} req restify request object
 * @param {object} res restify response object
 * @callback {function} next restify's next() handler
 */
Handlers.handleBindRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  var bindingId = req.params.binding_id;
  log.info('handleBindRequest - (bindingId: %s) for (instanceId: %s) from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, reply, result) {
    if (error) {
      log.error('handleBindRequest - Failed in sending bind request (bindingId: %s) for (instanceId: %s) to Azure. Bind Error: %j', bindingId, instanceId, error);
      res.send(error.statusCode, error);

      log.info('handleBindRequest - Succeeded in sending the bind error response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    }

    broker.db.createServiceBinding(req.params, result, function(err){
      if (err) {
        log.error('handleBindRequest - %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      res.send(HttpStatus.CREATED, reply.value);
      log.info('handleBindRequest - Succeeded in sending the bind response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    });
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      log.error('handleBindRequest - %j', err);
      res.send(err.statusCode, err);
      return next();
    }
    if (_.isEmpty(serviceInstance)) {
      res.send(HttpStatus.GONE, {});
      log.info('handleBindRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next();
    }

    var operation = 'bind';
    var params = req.params;
    params.parameters = serviceInstance.parameters;
    params.provisioning_result = serviceInstance.provisioning_result;
    params.azure = credentialsAndSubscriptionId;
    params.accountPool = accountPool;
    emitEvent(broker, operation, params, processResponse, next);
  });
};

/**
 * handles service unbinding requests
 *
 * @this {restifyserver}
 * @param {BrokerV2} broker the broker instance
 * @param {object} req restify request object
 * @param {object} res restify response object
 * @callback {function} next restify's next() handler
 */
Handlers.handleUnbindRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  var bindingId = req.params.binding_id;
  log.info('handleUnbindRequest - (bindingId: %s) for (instanceId: %s) from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, reply, result) {
    if (error) {
      log.error('handleUnbindRequest - Failed in sending unbind request (bindingId: %s) for (instanceId: %s) to Azure. Unbind Error: %j', bindingId, instanceId, error);
      res.send(error.statusCode, error);

      log.info('handleUnbindRequest - Succeeded in sending the unbind error response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    }

    broker.db.deleteServiceBinding(instanceId, bindingId, function(err){
      if (err) {
        log.error('handleUnbindRequest - %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      res.send(HttpStatus.OK, reply.value);
      log.info('handleUnbindRequest - Succeeded in sending the unbind response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    });
  };

  async.series([
      function(callback) {
        broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
          if (err) {
            return callback(err);
          }

          log.info('handleUnbindRequest - Succeeded in finding the record by (instanceId: %s) in broker database.', instanceId);
          callback(null, serviceInstance);
        });
      },
      function(callback) {
        broker.db.getServiceBinding(bindingId, function(err, binding) {
          if (err) {
            return callback(err);
          }

          log.info('handleUnbindRequest - Succeeded in finding the record by (bindingId: %s) in broker database.', bindingId);
          callback(null, binding.binding_result);
        });
      }
    ],
    function(err, results) {
      if (err) {
        log.error('handleUnbindRequest - %j', err);
        res.send(err.statusCode, err);
        return next();
      }

      var operation = 'unbind';
      var params = req.params;
      params.parameters = results[0]['parameters'];
      params.provisioning_result = results[0]['provisioning_result'];
      params.binding_result = results[1];
      params.azure = credentialsAndSubscriptionId;
      params.accountPool = accountPool;
      emitEvent(broker, operation, params, processResponse, next);
    });
};

/**
 * handles service Updating requests
 *
 * @this {restifyserver}
 * @param {BrokerV2} broker the broker instance
 * @param {object} req restify request object
 * @param {object} res restify response object
 * @callback {function} next restify's next() handler
 */
Handlers.handleUpdateRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  log.info('handleUpdateRequest - for (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var finalReply = {statusCode:500, value:{}};

  async.waterfall([
    // Get the instance from the broker DB
    function (callback) {
      broker.db.getServiceInstance(instanceId, callback);
    },
    // Update the instance
    function (serviceInstance, callback) {
      log.debug('Got service instance : %j', serviceInstance);
      var operation = 'update';
      var params = {
        instance: serviceInstance,
        requested: req.params,
        service_id: serviceInstance.service_id
      };
      emitEvent(broker, operation, params, callback, next);
    },
    function (reply, updatedInstance, callback) {
      // Update the broker DB with newParams
      log.info('handleUpdateRequest - Succeeded in sending the update response (%j) for (instanceId: %s) to cc.', reply.value, instanceId);
      finalReply = reply;
      broker.db.setServiceInstance(updatedInstance, callback);
    }],
    function (err) {
      if (err) {
        log.error('handleUpdateRequest - Failed update for (instanceId: %s). Error: %j', instanceId, err);
        res.send(err.statusCode, err);
        return next();
      }
      res.send(finalReply.statusCode, finalReply.value);
      return next();
    });

};

module.exports = Handlers;

