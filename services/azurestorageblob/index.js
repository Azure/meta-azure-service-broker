'use strict';

var Config = require('./catalog')

var Handlers = {};

Handlers.catalog = function(req, next) {
  var reply = Config
  return reply;
}

Handlers.provision = function(req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {
      dashboard_url: ""
    };
    next(reply);
  }
}

Handlers.poll = function(req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {
      state: "succeeded",
      description: "succeeded",
    };
    next(reply);
  }
}

Handlers.deprovision = function(req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {};
    next(reply);
  }
}

Handlers.bind = function(req, next) {
  if (req.params.service_id == Config.id) {
    var reply = {};
    reply.credentials = {
      echo: 'echo',
    };
    next(reply);
  }
};

Handlers.unbind = function(req, next) {
  next();
};

module.exports = Handlers;
