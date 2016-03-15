'use strict';

var async = require('async');

var Common = require('./lib/common');
var Broker = require('./lib/broker');
var Config = require('./config/meta-service-broker');

Common.validateEnvironmentVariables();
var broker = new Broker(Config);
broker.start();

var echo = require('./lib/services/echo')
var azurestorageblob = require('./lib/services/azurestorageblob')

var addListeners = function(serviceId, serviceModule) {
  broker.on('provision-' + serviceId, serviceModule.provision);
  broker.on('poll-' + serviceId, serviceModule.poll);
  broker.on('deprovision-' + serviceId, serviceModule.deprovision);
  broker.on('bind-' + serviceId, serviceModule.bind);
  broker.on('unbind-' + serviceId, serviceModule.unbind);
}

broker.log.info(
  'Starting to collect the service offering and plans of each service module...'
);

async.parallel([
    function(callback) {
      echo.catalog(broker, function(err, result) {
        addListeners(result.id, echo);
        callback(null, result);
      });
    },
    function(callback) {
      azurestorageblob.catalog(broker, function(err, result) {
        addListeners(result.id, azurestorageblob);
        callback(null, result);
      });
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