/*jshint camelcase: false */

'use strict';

var Config = require('./echo-service');

var Handlers = {};

Handlers.catalog = function(log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function(log, params, next) {
  var reply = {
    dashboard_url: '1'
  };
  next(reply);
};

Handlers.poll = function(log, params, next) {
  var reply = {
    state: 'succeeded',
    description: 'succeeded',
  };
  next(reply);
};

Handlers.deprovision = function(log, params, next) {
  var reply = {};
  next(reply);
};

Handlers.bind = function(log, params, next) {
  var reply = {};
  reply.credentials = {
    echo: 'echo',
  };
  next(reply);
};

Handlers.unbind = function(log, params, next) {
  next();
};

module.exports = Handlers;
