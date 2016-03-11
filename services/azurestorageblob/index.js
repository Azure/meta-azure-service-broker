'use strict';

var Config = require('./catalog')

var Handlers = {};

Handlers.catalog = function(broker, req, next) {
  var reply = Config;
  return reply;
}

Handlers.provision = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {
      dashboard_url: ""
    };
    next(reply);
  }
}

Handlers.poll = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {
      state: "succeeded",
      description: "succeeded",
    };
    next(reply);
  }
}

Handlers.deprovision = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {};
    next(reply);
  }
}

Handlers.bind = function(broker, req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {};
    reply.credentials = {
      echo: 'echo',
    };
    next(reply);
  }
};

Handlers.unbind = function(broker, req, next) {
  next();
};

module.exports = Handlers;
