/********************************/
/* Broker V2 API HTTP handlers */
/********************************/
'use strict';

var Restify = require('restify');
var url = require('url');
var qs = require('querystring');

var Handlers = {};

/**
 * This is authentication middleware supplied to restify by the broker.
 * @param {BrokerV2} broker the broker instance
 */
Handlers.authenticate = function(broker) {
  return function(req, res, next) {
    if (broker.opts.authUser || broker.opts.authPassword) {
      if (req.authorization.basic && req.authorization.basic.username ===
        broker.opts.authUser && req.authorization.basic.password === broker
        .opts.authPassword) {
        return next();
      } else {
        var err = 'Invalid auth credentials for provision request: ' + req.headers;
        broker.log.error(err);
        res.status(401);
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
  broker.log.info('Processing catalog request from ' + req.connection.remoteAddress +
    ':' + req.connection.remotePort);

  var processResponse = function(reply) {
    reply = reply || {
      services: [],
    };

    if (reply.services.length == 0) {
      return next(new Error(
        'There should be at least one service provided by the broker'));
    }

    res.send(reply);
  };

  if (broker.listeners('catalog').length > 0) {
    broker.emit('catalog', broker, req, processResponse);
  } else {
    broker.log.error('No listeners attached for the "catalog" event');
    return next(new Error('Catalog not implemented on this broker. ' +
      req.params.version));
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

  broker.log.info('Processing provision request ' + req.params.id + ' from ' +
    req.connection.remoteAddress + ':' + req.connection.remotePort);

  var queryUrl = url.parse(req.url).query;
  var accepts_incomplete = qs.parse(queryUrl)['accepts_incomplete'];

  if (typeof(accepts_incomplete) == 'undefined' || accepts_incomplete == 'false') {
      var msg = 'This service plan requires client support for asynchronous service operations.';
      broker.log.warn(msg);
      res.status(422);
      var reply = {
        error: 'AsyncRequired',
        description: msg
      };
      res.send(reply);
      return next();
  }

  var processResponse = function(reply) {
    reply = reply || {};

    res.status(202);
    res.send(reply);
    broker.db.provision(req, reply, next);
  };

  if (broker.listeners('provision').length > 0) {
    broker.emit('provision', broker, req, processResponse);
  } else {
    broker.log.error('No listeners attached for the "provision" event');
    return next(new Error('Provisioning not implemented on this broker. ' +
      req.params.version));
  }
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
  broker.log.info('Processing poll request ' + req.params.id + ' from ' + req
    .connection.remoteAddress + ':' + req.connection.remotePort);

  var processResponse = function(reply) {
    reply = reply || {
      'state': '',
      'description': '',
    };
    res.send(reply);
  };

  if (broker.listeners('poll').length > 0) {
    broker.db.getServiceID(req.params.id, function(err, serviceID) {
      req.params.service_id = serviceID;
      broker.log.info('%j', req.params)
      broker.emit('poll', broker, req, processResponse);
    });
  } else {
    broker.log.error('No listeners attached for the "poll" event');
    return next(new Error('Polling not implemented on this broker. ' + req.params
      .version));
  }
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
  broker.log.info('Deprovision request for service instance ' + req.params.id +
    ' from ' + req.connection.remoteAddress + ':' + req.connection.remotePort
  );

  var processResponse = function(reply) {
    reply = reply || {};

    if (reply.doesNotExist) {
      res.status(410);
    }

    res.send(reply);
    broker.db.deprovision(req, reply, next);
  };

  if (broker.listeners('deprovision').length > 0) {
    broker.emit('deprovision', broker, req, processResponse);
  } else {
    broker.log.error('No listeners attached for the "deprovision" event');
    return next(new Error('Deprovisioning not implemented on this broker. ' +
      req.params.version));
  }
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
  broker.log.info('Bind request ' + req.params.id + ' for service instance ' +
    req.params.instance_id + ' from ' + req.connection.remoteAddress + ':' +
    req.connection.remotePort);

  var processResponse = function(reply) {
    reply = reply || {};

    res.status(201);
    res.send(reply);
    broker.db.bind(req, reply, next);
  };


  if (broker.listeners('bind').length > 0) {
    broker.emit('bind', broker, req, processResponse);
  } else {
    broker.log.error('No listeners attached for the "bind" event');
    return next(new Error('Binding not implemented on this broker. ' + req.params
      .version));
  }
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
  broker.log.info('Unbind request ' + req.params.id +
    ' for service instance ' + req.params.instance_id + ' from ' + req.connection
    .remoteAddress + ':' + req.connection.remotePort);

  var processResponse = function(reply) {
    reply = reply || {};
    res.status(200);
    res.send(reply);
    broker.db.unbind(req, reply, next);
  };

  if (broker.listeners('unbind').length > 0) {
    broker.emit('unbind', broker, req, processResponse);
  } else {
    broker.log.error('No listeners attached for the "unbind" event');
    return next(new Error('Unbinding not implemented on this broker. ' + req.params
      .version));
  }
};

module.exports = Handlers;
