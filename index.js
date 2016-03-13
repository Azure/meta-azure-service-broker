'use strict';

var Common = require('./common');
Common.validateEnvironmentVariables();

var Broker = require('./broker');
var Config = require('./config/meta-service-broker');

var broker = new Broker(Config);

broker.start();

// Listeners for echo service
var echo = require('./services/echo')
broker.on('provision', echo.provision);
broker.on('poll', echo.poll);
broker.on('deprovision', echo.deprovision);
broker.on('bind', echo.bind);
broker.on('unbind', echo.unbind);

// Listeners for echo service
var azurestorageblob = require('./services/azurestorageblob')
broker.on('provision', azurestorageblob.provision);
broker.on('poll', azurestorageblob.poll);
broker.on('deprovision', azurestorageblob.deprovision);
broker.on('bind', azurestorageblob.bind);
broker.on('unbind', azurestorageblob.unbind);

broker.on('catalog', function(broker, req, next) {
  var reply = {};
  reply.services = [];
  reply.services.push(echo.catalog(broker, req, next));
  reply.services.push(azurestorageblob.catalog(broker, req, next));
  next(reply);
});
