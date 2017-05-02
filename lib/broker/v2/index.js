/** @module BrokerV2 */

'use strict';

var Db = require('../db');
var Events = require('events');
var Handlers = require('./api-handlers');
var Restify = require('restify');
var RestifyMiddleware = require('../../common/restify-middleware');
var Util = require('util');

var common = require('../../common');
var log = common.getLogger(common.LOG_CONSTANTS.BROKER);

/**
 * The Broker starts a restify broker that talks to the CF cloud controller
 * API, primarily for updating the service catalog and service plans.
 * @constructor
 * @param {Object} opts - Broker options.
 */
var BrokerV2 = function(opts) {
  if (!(this instanceof BrokerV2)) {
    return new BrokerV2(opts);
  }

  Events.EventEmitter.call(this);

  this.opts = opts;

  this.db = new Db(opts.database);

  this.restServer = this.createRestServer();

  return this;
};

Util.inherits(BrokerV2, Events.EventEmitter);

/**
 * Will shutdown the server gracefully.
 *
 * @this {BrokerV2}
 */
BrokerV2.prototype.stop = function() {
  var broker = this;

  if (broker.restServer) {
    broker.restServer.close();
  }

  log.info('Broker has been shutdown.');
};

/**
 * This is the main entry point to start the broker, after the constructor
 * has been instantiated.
 *
 * @this {BrokerV2}
 */
BrokerV2.prototype.start = function() {
  var broker = this;
  var server = broker.restServer;

  this.db.createSchema(function(err) {
    if (err) {
      throw new Error(Util.format('Failed to create schema - error: %j', err));
    }

    server.listen(broker.opts.port, function(error) {
      if (error) {
        throw new Error(Util.format('Broker REST server failed to listen on port %s : %j', broker.opts.port, error));
      }
      log.info('%s broker is listening on port %s', server.name, broker.opts.port);

      broker.initPeriodicJobs();

      log.info('Broker now started with PID: ' + process.pid);
    });
  });
};

/**
 * Creates the REST API server that the cloud controller will use
 * to communicate {un}provisioning/{un}binding requests.
 *
 * See also, Restify on NPM.
 *
 * @this {BrokerV2}
 */
BrokerV2.prototype.createRestServer = function() {
  var broker = this;
  var versionNS = '/v' + broker.opts.semver.major;

  var server = Restify.createServer({
    name: broker.opts.name,
    version: broker.opts.apiVersion
  });

  server.use(RestifyMiddleware.validateAPIVersion(broker.opts.semver));
  server.use(Restify.authorizationParser());
  server.use(Handlers.authenticate(broker.opts.serviceBroker.credentials));
  server.use(Restify.acceptParser(server.acceptable));
  server.use(Restify.queryParser());
  server.use(Restify.bodyParser());
  server.use(RestifyMiddleware.requestLogger({
    prefix: 'HTTP Request'
  }));

  // Catalog
  server.get(versionNS + '/catalog',
    function(req, res, next) {
      Handlers.handleCatalogRequest(broker, req, res, next);
    }
  );

  // Provision
  server.put(versionNS + '/service_instances/:instance_id',
    function(req, res, next) {
      Handlers.handleProvisionRequest(broker, req, res, next);
    }
  );

  // Poll
  server.get(versionNS + '/service_instances/:instance_id/last_operation',
    function(
      req, res, next) {
      Handlers.handlePollRequest(broker, req, res, next);
    }
  );

  // Deprovision
  server.del(versionNS + '/service_instances/:instance_id',
    function(req, res, next) {
      Handlers.handleDeProvisionRequest(broker, req, res, next);
    }
  );

  // Bind
  server.put(versionNS + '/service_instances/:instance_id/service_bindings/:binding_id',
    function(req, res, next) {
      Handlers.handleBindRequest(broker, req, res, next);
    }
  );

  // Unbind
  server.del(versionNS + '/service_instances/:instance_id/service_bindings/:binding_id',
    function(req, res, next) {
      Handlers.handleUnbindRequest(broker, req, res, next);
    }
  );

  // Update
  server.patch(versionNS + '/service_instances/:instance_id',
    function(req, res, next) {
      Handlers.handleUpdateRequest(broker, req, res, next);
    }
  );

  return server;
};

/**
 * Sets up background jobs to run at predefined intervals.
 *
 * @this {BrokerV2}
 */
BrokerV2.prototype.initPeriodicJobs = function() {};

module.exports = BrokerV2;
