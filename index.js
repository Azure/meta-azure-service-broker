'use strict';

var async = require('async');

var Common = require('./common');
var Broker = require('./broker');
var Config = require('./config/meta-service-broker');

Common.validateEnvironmentVariables();
var broker = new Broker(Config);
broker.start();

var echo = require('./services/echo')
var azurestorageblob = require('./services/azurestorageblob')

broker.log.info(
  'Starting to collect the service offering and plans of each service module...'
);
async.parallel([
    function(callback) {
      echo.catalog(broker, callback);
    },
    function(callback) {
      azurestorageblob.catalog(broker, callback);
    }
  ],
  function(err, results) {
    broker.log.info('All the service offerings and plans are collected.');
    broker.on('catalog', function(broker, req, next) {
      var reply = {};
      reply.services = results;
      next(reply);
    });
  });

// Listeners for echo service
broker.on('provision', echo.provision);
broker.on('poll', echo.poll);
broker.on('deprovision', echo.deprovision);
broker.on('bind', echo.bind);
broker.on('unbind', echo.unbind);

// Listeners for echo service
broker.on('provision', azurestorageblob.provision);
broker.on('poll', azurestorageblob.poll);
broker.on('deprovision', azurestorageblob.deprovision);
broker.on('bind', azurestorageblob.bind);
broker.on('unbind', azurestorageblob.unbind);