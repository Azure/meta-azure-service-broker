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
    broker.emit(event, broker.log, params, processResponse);
  } else {
    var errMsg = util.format('%sing is not implemented for the service %s on this broker.', operation, serviceId);
    broker.log.error(errMsg);
    return next(new Error(errMsg));
  }
};

/**
 * This is authentication middleware supplied to restify by the broker.
 * @param {BrokerV2} broker the broker instance
 */
Handlers.authenticate = function(broker) {
  return function(req, res, next) {
    if (broker.opts.authUser || broker.opts.authPassword) {
      if (req.authorization.basic && req.authorization.basic.username === broker.opts.authUser && req.authorization.basic.password === broker.opts.authPassword) {
        return next();
      } else {
        var err = util.format('Invalid auth credentials for requests: %s', req.headers);
        broker.log.error(err);
        res.status(HttpStatus.UNAUTHORIZED);
        res.setHeader('Connection', 'close');
        res.end();
        return next(new Restify.NotAuthorizedError());
      }
    } else {
      return next();
    }
  };
};

/**
 * Returns a complete service catalog listing to the CC.
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 */
Handlers.handleCatalogRequest = function(broker, req, res, next) {
  broker.log.info('Processing catalog request from %s:%s', req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(err, reply) {
    if (err) {
      res.status(err.statusCode);
      res.send(err);
    } else {
      reply = reply || {
        services: [],
      };

      res.send(reply);
    }
  };

  if (broker.listeners('catalog').length > 0) {
    broker.emit('catalog', processResponse);
  } else {
    broker.log.error('No listeners attached for the "catalog" event');
    return next(new Error('Catalog not implemented on this broker. ' + req.params.version));
  }
  next();
};

/**
 * Handles new service provisioning requests
 *
 * @this {RestifyServer}
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} restify's next() handler
 */
Handlers.handleProvisionRequest = function(broker, req, res, next) {
  broker.log.info('Processing provision request %s from %s:%s', req.params.instance_id, req.connection.remoteAddress, req.connection.remotePort);

  var accepts_incomplete = req.params.accepts_incomplete;

  if (typeof(accepts_incomplete) == 'undefined' || accepts_incomplete == 'false') {
    var msg = 'This service plan requires client support for asynchronous service operations.';
    broker.log.warn(msg);
    res.status(HttpStatus.UNPROCESSABLE_ENTITY);
    var reply = {
      error: 'AsyncRequired',
      description: msg
    };
    res.send(reply);
    return next();
  }

  var processResponse = function(err, reply, result) {
    if (err) {
      res.status(err.statusCode);
      res.send(err);
    } else {
      reply = reply.value || {};
      res.status(HttpStatus.ACCEPTED);
      res.send(reply);

      broker.db.provision(req, result);
    }
  };

  var operation = 'provision';
  var params = req.params;
  params.azure = credentialsAndSubscriptionId;
  emitEvent(broker, operation, params, processResponse, next);
};

/**
 * Handles new service polling requests
 *
 * @this {RestifyServer}
 * @param {BrokerV2} broker the broker instance
 * @param {Object} req restify request object
 * @param {Object} res restify response object
 * @callback {Function} restify's next() handler
 */
Handlers.handlePollRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;

  broker.log.info('Processing poll request %s from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(err, reply, result) {
    if (err) {
      if (err.statusCode == HttpStatus.NOT_FOUND) {
        res.status(HttpStatus.GONE);
      } else {
        res.status(err.statusCode);
      }
      res.send(err);
    } else {
      reply = reply.value || {
        'state': '',
        'description': '',
      };
      res.send(reply);

      if (reply.state == 'succeeded') {
        broker.db.poll(req, result);
      }
    }
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (_.isEmpty(serviceInstance)) {
      res.status(HttpStatus.GONE);
      res.setHeader('Connection', 'close');
      res.end();
    } else {
      var operation = 'poll';
      var params = serviceInstance;
      params.azure = credentialsAndSubscriptionId;
      emitEvent(broker, operation, params, processResponse, next);
    }
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
 * @callback {Function} restify's next() handler
 */
Handlers.handleDeProvisionRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;

  broker.log.info('Deprovision request for service instance %s from %s:%s', instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(err, reply, result) {
    if (err) {
      res.status(err.statusCode);
      res.send(err);
    } else {
      reply = reply.value || {};
      res.status(HttpStatus.ACCEPTED);
      res.send(reply);

      broker.db.deprovision(req, result);
    }
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    if (_.isEmpty(serviceInstance)) {
      res.status(HttpStatus.GONE);
      res.setHeader('Connection', 'close');
      res.end();
    } else {
      var operation = 'deprovision';
      var params = req.params;
      params.provisioning_result = serviceInstance.provisioning_result;
      params.azure = credentialsAndSubscriptionId;
      emitEvent(broker, operation, params, processResponse, next);
    }
  });
};

/**
 * handles new service binding requests
 *
 * @this {restifyserver}
 * @param {BrokerV2} broker the broker instance
 * @param {object} req restify request object
 * @param {object} res restify response object
 * @callback {function} restify's next() handler
 */
Handlers.handleBindRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  var bindingId = req.params.binding_id;

  broker.log.info('Bind request %s for service instance %s from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(err, reply, result) {
    if (err) {
      res.status(err.statusCode);
      res.send(err);
    } else {
      reply = reply.value || {};
      res.status(HttpStatus.CREATED);
      res.send(reply);

      broker.db.bind(req, result);
    }
  };

  broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
    var operation = 'bind';
    var params = req.params;
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
 * @callback {function} restify's next() handler
 */
Handlers.handleUnbindRequest = function(broker, req, res, next) {
  var instanceId = req.params.instance_id;
  var bindingId = req.params.binding_id;

  broker.log.info('Unbind request %s for service instance %s from %s:%s', bindingId, instanceId, req.connection.remoteAddress, req.connection.remotePort);

  var processResponse = function(err, reply, result) {
    if (err) {
      res.status(err.statusCode);
      res.send(err);
    } else {
      reply = reply.value || {};
      res.status(HttpStatus.OK);
      res.send(reply);

      broker.db.unbind(req, result);
    }
  };

  async.series([
      function(callback) {
        broker.db.getServiceInstance(instanceId, function(err, serviceInstance) {
          if (err) {
            callback(err);
          } else {
            callback(null, serviceInstance.provisioning_result);
          }
        });
      },
      function(callback) {
        broker.db.getServiceBinding(bindingId, function(err, binding) {
          if (err) {
            callback(err);
          } else {
            callback(null, binding.binding_result);
          }
        });
      }
    ],
    function(err, results) {
      if (err) {
        broker.log.error(err);
        next(err);
      } else {
        if (results[0] && results[1]) {
          var operation = 'unbind';
          var params = req.params;
          params.provisioning_result = results[0];
          params.binding_result = results[1];
          params.azure = credentialsAndSubscriptionId;
          emitEvent(broker, operation, params, processResponse, next);
        } else {
          res.status(HttpStatus.GONE);
          res.setHeader('Connection', 'close');
          res.end();
        }
      }
    });
};

module.exports = Handlers;
