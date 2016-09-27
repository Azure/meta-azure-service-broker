/*jshint camelcase: false */

/********************************/
/* Broker V2 API HTTP handlers */
/********************************/
'use strict';

var Restify = require('restify');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var common = require('../../common');

var credentialsAndSubscriptionId = common.getCredentialsAndSubscriptionId();

var Handlers = {};

var emitEvent = function(broker, operation, params, processResponse, next) {
  var serviceId = params.service_id;
  var event = util.format('%s-%s', operation, serviceId);

  if (broker.listeners(event).length > 0) {
    broker.log.info('Emitting event (%s) for (instanceId: %s).', event, params.instance_id);
    broker.emit(event, broker.log, params, processResponse);
  } else {
    var errMsg = util.format('%sing is not implemented for the service %s in this broker.', operation, serviceId);
    broker.log.error(errMsg);
    return next(new Restify.NotImplementedError(errMsg));
  }
};

/**
 * This is authentication middleware supplied to restify by the broker.
 * @param {BrokerV2} broker the broker instance
 */
Handlers.authenticate = function(broker) {
  return function(req, res, next) {
    if (req.authorization.basic) {
      if (req.authorization.basic.username === process.env['SECURITY_USER_NAME'] &&
        req.authorization.basic.password === process.env['SECURITY_USER_PASSWORD']) {
        // This is for Pivotal Ops Manager
        return next();
      } else if (req.authorization.basic.username === broker.opts.authUser &&
        req.authorization.basic.password === broker.opts.authPassword) {
        // This is for community version
        return next();
      }
    }

    broker.log.error('Invalid auth credentials for requests.');
    return next(new Restify.NotAuthorizedError());
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
  broker.log.info('handleCatalogRequest - %s:%s', req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(reply) {
    res.send(reply);
    broker.log.info('handleCatalogRequest - Succeeded in sending the catalog response to cc.');
    return next();
  };

  if (broker.listeners('catalog').length > 0) {
    broker.emit('catalog', processResponse);
  } else {
    broker.log.error('handleCatalogRequest - No listeners attached for the "catalog" event');
    return next(new Restify.NotImplementedError('Catalog not implemented in this broker. ' + req.params.version));
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
  broker.log.info('handleProvisionRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  // Check whether the request is asynchronous.
  var accepts_incomplete = req.params.accepts_incomplete;
  if (typeof(accepts_incomplete) == 'undefined' || accepts_incomplete == 'false') {
    var msg = 'This service plan requires client support for asynchronous service operations.';
    broker.log.warn('handleProvisionRequest - %s', msg);
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
  broker.log.info('handleProvisionRequest - Processing provision request for (azureInstanceId: %s)', azureInstanceId);

  var processResponse = function(error, reply, result) {
    if (error) {
      broker.log.error('handleProvisionRequest - Failed in sending provision request for (instanceId: %s) to Azure. Provision Error: %j', instanceId, error);
      // Need to delete the inserted record from broker database
      broker.db.deleteServiceInstance(instanceId, function(err){
        if (err) {
          // CC will call deprovision
          var msg = util.format('Failed in deleting the provision record for (instanceId: %s) from database: %s.', instanceId, err);
          broker.log.error('handleProvisionRequest - %s', msg);
          return next(new Restify.InternalServerError(msg));
        }

        res.send(error.statusCode, error);
        broker.log.info('handleProvisionRequest - Succeeded in sending the provision error response for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    } else {
      broker.log.info('handleProvisionRequest - Succeeded in sending provision request for (instanceId: %s) to Azure.', instanceId);
      // Need to update result in the inserted record in broker database
      broker.db.updateServiceInstanceProvisioningResult(instanceId, JSON.stringify(result), function(err){
        if (err) {
          // CC will call deprovision
          var msg = util.format('Failed in updating the provision record for (instanceId: %s) in broker database: %s', instanceId, err);
          broker.log.error('handleProvisionRequest - %s', msg);
          return next(new Restify.InternalServerError(err));
        }

        body = reply.value;
        res.send(HttpStatus.ACCEPTED, body);
        broker.log.info('handleProvisionRequest - Succeeded in sending the provision response for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    }
  };

  // Insert a record with (status:pending, lastOperation: provision) into broker database
  broker.db.createServiceInstance(req.params, function(err){
    if (err) {
      // It fails when a record with the same azureInstanceId exists in broker database
      if (err instanceof common.DBConflictError) {
        var msg = util.format('Failed in inserting the record for (instanceId: %s) into the broker database. It is caused by that a record with the same azureInstanceId exists. DB Error: %j', instanceId, err.err);
        broker.log.error('handleProvisionRequest - %s', msg);
        return next(new Restify.ConflictError(msg));
      }
      
      var msg = util.format('Failed in inserting the record for (instanceId: %s) into the broker database. DB Error: %j', instanceId, err);
      broker.log.error('handleProvisionRequest - %s', msg);
      return next(new Restify.InternalServerError(msg));
    }

    // Call module service to do provisioning
    var operation = 'provision';
    var params = req.params;
    params.azure = credentialsAndSubscriptionId;
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
 */
var handleProvisionPollResponse = function(error, reply, result, broker, req, res, next) {
  var instanceId = req.params.instance_id;
  broker.log.info('handleProvisionPollResponse - (instanceId: %s)', instanceId);

  if (error) {
    broker.log.error('handleProvisionPollResponse - provision: Failed in polling the status for (instanceId: %s). Error: %j', instanceId, error);
    broker.db.deleteServiceInstance(instanceId, function(err){
      if (err) {
        // CC will call deprovision
        var msg = util.format('Failed in deleting the record (instanceId: %s) from the broker database. Provision Error: %j. DB Error: %j.', instanceId, error, err);
        broker.log.error('handleProvisionPollResponse - provision: %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      if (error.statusCode == HttpStatus.NOT_FOUND) {
        res.send(HttpStatus.GONE, {});
        broker.log.info('handleProvisionPollResponse - provision: Succeeded in sending the poll response GONE for (instanceId: %s) to cc.', instanceId);
      } else {
        res.send(error.statusCode, error);
        broker.log.info('handleProvisionPollResponse - provision: Succeeded in sending the poll error response for (instanceId: %s) to cc. Provision Error: %j', instanceId, error);
      }

      return next();
    });
  } else {
    broker.log.info('handleProvisionPollResponse - provision: Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    if (reply.value.state != 'succeeded') {
      res.send(reply.value);
      broker.log.info('handleProvisionPollResponse - provision: Succeeded in sending the poll response for (instanceId: %s) to cc. State: %j', instanceId, reply);
      return next();
    }

    broker.db.updateServiceInstanceProvisioningResult(instanceId, JSON.stringify(result), function(err){
      if (err) {
        // CC will call deprovision
        var msg = util.format('Failed in updating the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err);
        broker.log.error('handleProvisionPollResponse - provisoin: %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      res.send(reply.value);
      broker.log.info('handleProvisionPollResponse - provisoin: Succeeded in sending the provision poll response for (instanceId: %s) to cc.', instanceId);
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
  broker.log.info('handleDeProvisionPollResponse - (instanceId: %s)', instanceId);

  if (error) {
    broker.log.error('handleDeProvisionPollResponse - deprovisoin: Failed in polling the status for (instanceId: %s). Error: %j', instanceId, error);
    if (error.statusCode == HttpStatus.NOT_FOUND) {
      broker.db.deleteServiceInstance(instanceId, function(err){
        if (err) {
          var msg = util.format('Failed in deleting the record for (instanceId: %s) from the broker database. Deprovision Error: %j. DB Error: %j.', instanceId, error, err);
          broker.log.error('handleDeProvisionPollResponse - deprovision: %s', msg);
          return next(new Restify.InternalServerError(msg));
        }
        res.send(HttpStatus.GONE, {});
        broker.log.info('handleDeProvisionPollResponse - deprovision: Succeeded in sending the poll response GONE for (instanceId: %s) to cc.', instanceId);
        return next();
      });
    }

    res.send(error.statusCode, error);
    broker.log.info('handleDeProvisionPollResponse - deprovision: Succeeded in sending the poll error response for (instanceId: %s) to cc. Deprovision Error: %j', instanceId, error);
    return next();
  } else {
    broker.log.info('handleDeProvisionPollResponse - deprovisoin: Succeeded in polling the status for (instanceId: %s). State: %j', instanceId, reply);
    if (reply.value.state != 'succeeded') {
      res.send(reply.value);
      broker.log.info('handleDeProvisionPollResponse - deprovisoin: Succeeded in sending the poll response for (instanceId: %s) to cc. State: %j', instanceId, reply);
      return next();
    }

    broker.db.deleteServiceInstance(instanceId, function(err){
      if (err) {
        // CC will call deprovision
        var msg = util.format('Failed in deleting the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err);
        broker.log.error('handleDeProvisionPollResponse - deprovisoin: %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      res.send(reply.value);
      broker.log.info('handleDeProvisionPollResponse - deprovisoin: Succeeded in sending the deprovision poll response for (instanceId: %s) to cc.', instanceId);
      return next();
    });
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
  broker.log.info('handlePollRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, lastOperation, reply, result) {
    if (lastOperation == 'provision') {
      return handleProvisionPollResponse(error, reply, result, broker, req, res, next);
    } else {
      return handleDeProvisionPollResponse(error, reply, result, broker, req, res, next);
    }
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      var msg = util.format('Failed in finding the record by (instanceId: %s) in broker database. DB Error: %j', instanceId, err);
      broker.log.error('handlePollRequest - %s', msg);
      return next(new Restify.InternalServerError(msg));
    }
    if (_.isEmpty(serviceInstance)) {
      broker.log.info('handlePollRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next(new Restify.GoneError());
    }

    var operation = 'poll';
    var params = serviceInstance;
    params.azure = credentialsAndSubscriptionId;
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
  broker.log.info('handleDeProvisionRequest - (instanceId: %s) from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, reply, result) {
    if (error) {
      broker.log.error('handleDeProvisionRequest - Failed in sending deprovision request for (instanceId: %s) to Azure. Deprovision Error: %j', instanceId, error);
      res.send(error.statusCode, error);

      broker.log.info('handleDeProvisionRequest - Succeeded in sending the deprovision error response for (instanceId: %s) to cc.', instanceId);
      return next();
    }

    broker.db.updateServiceInstanceLastOperation(instanceId, 'deprovision', function(err){
      if (err) {
        var msg = util.format('Failed in updating the record (instanceId: %s) in broker database. DB Error: %j', instanceId, err);
        broker.log.error('handleDeProvisionRequest - %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      res.send(HttpStatus.ACCEPTED, reply.value);
      broker.log.info('handleDeProvisionRequest - Succeeded in sending the deprovision response for (instanceId: %s) to cc.', instanceId);
      return next();
    });
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      var msg = util.format('Failed in finding the record by (instanceId: %s) in broker database. DB Error: %j', instanceId, err);
      broker.log.error('handleDeProvisionRequest - %s', msg);
      return next(new Restify.InternalServerError(msg));
    }
    if (_.isEmpty(serviceInstance)) {
      broker.log.info('handleDeProvisionRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next(new Restify.GoneError());
    }

    var operation = 'deprovision';
    var params = req.params;
    params.provisioning_result = serviceInstance.provisioning_result;
    params.azure = credentialsAndSubscriptionId;
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
  broker.log.info('handleBindRequest - (bindingId: %s) for (instanceId: %s) from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, reply, result) {
    if (error) {
      broker.log.error('handleBindRequest - Failed in sending bind request (bindingId: %s) for (instanceId: %s) to Azure. Bind Error: %j', bindingId, instanceId, error);
      res.send(error.statusCode, error);

      broker.log.info('handleBindRequest - Succeeded in sending the bind error response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    }

    broker.db.createServiceBinding(req.params, result, function(err){
      if (err) {
        var msg = util.format('Failed in inserting the record (bindingId: %s) for(instanceId: %s) in broker database. DB Error: %j', bindingId, instanceId, err);
        broker.log.error('handleBindRequest - %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      res.send(HttpStatus.CREATED, reply.value);
      broker.log.info('handleBindRequest - Succeeded in sending the bind response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    });
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (err) {
      var msg = util.format('Failed in finding the record by (instanceId: %s) in broker database. DB Error: %j', instanceId, err);
      broker.log.error('handleBindRequest - %s', msg);
      return next(new Restify.InternalServerError(msg));
    }
    if (_.isEmpty(serviceInstance)) {
      broker.log.info('handleBindRequest - (instanceId: %s) does not exist in broker database.', instanceId);
      return next(new Restify.GoneError());
    }

    var operation = 'bind';
    var params = req.params;
    params.parameters = serviceInstance.parameters;
    params.provisioning_result = serviceInstance.provisioning_result;
    params.azure = credentialsAndSubscriptionId;
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
  broker.log.info('handleUnbindRequest - (bindingId: %s) for (instanceId: %s) from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(error, reply, result) {
    if (error) {
      broker.log.error('handleUnbindRequest - Failed in sending unbind request (bindingId: %s) for (instanceId: %s) to Azure. Unbind Error: %j', bindingId, instanceId, error);
      res.send(error.statusCode, error);

      broker.log.info('handleUnbindRequest - Succeeded in sending the unbind error response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    }

    broker.db.deleteServiceBinding(req.params.binding_id, function(err){
      if (err) {
        var msg = util.format('Failed in deleting the record (bindingId: %s) for(instanceId: %s) in broker database. DB Error: %j', bindingId, instanceId, err);
        broker.log.error('handleUnbindRequest - %s', msg);
        return next(new Restify.InternalServerError(msg));
      }

      res.send(HttpStatus.OK, reply.value);
      broker.log.info('handleUnbindRequest - Succeeded in sending the unbind response (bindingId: %s) for (instanceId: %s) to cc.', bindingId, instanceId);
      return next();
    });
  };

  async.series([
      function(callback) {
        broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
          if (err) {
            var msg = util.format('Failed in finding the record by (instanceId: %s) in broker database. DB Error: %j', instanceId, err);
            return callback(msg);
          }

          broker.log.info('handleUnbindRequest - Succeeded in finding the record by (instanceId: %s) in broker database.', instanceId);
          callback(null, serviceInstance.provisioning_result);
        });
      },
      function(callback) {
        broker.db.getServiceBinding(bindingId, function(err, binding) {
          if (err) {
            var msg = util.format('Failed in finding the record by (bindingId: %s) in broker database. DB Error: %j', bindingId, err);
            return callback(msg);
          }

          broker.log.info('handleUnbindRequest - Succeeded in finding the record by (bindingId: %s) in broker database.', bindingId);
          callback(null, binding.binding_result);
        });
      }
    ],
    function(err, results) {
      if (err) {
        broker.log.error('handleUnbindRequest - %s', err);
        return next(new Restify.InternalServerError(err));
      }

      var operation = 'unbind';
      var params = req.params;
      params.provisioning_result = results[0];
      params.binding_result = results[1];
      params.azure = credentialsAndSubscriptionId;
      emitEvent(broker, operation, params, processResponse, next);
    });
};

module.exports = Handlers;

