'use strict';

var async = require('async');

var common = require('./lib/common');
var Broker = require('./lib/broker');
var config = require('./config/meta-service-broker');
var echo = require('./lib/services/echo')
var azurestorageblob = require('./lib/services/azurestorageblob')

var broker = new Broker(config);

broker.log.info(
  'Validating and getting Azure credentials and subscript ID from environment variables...'
);
common.validateEnvironmentVariables();

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

var params = {};
params.azure = common.getCredentialsAndSubscriptionId();

async.parallel([
    function(callback) {
      echo.catalog(broker.log, params, function(err,
        result) {
        if (err) {
          callback(err);
        } else {
          addListeners(result.id, echo);
          callback(null, result);
        }
      });
    },
    function(callback) {
      azurestorageblob.catalog(broker.log, params,
        function(err, result) {
          if (err) {
            callback(err);
          } else {
            addListeners(result.id, azurestorageblob);
            callback(null, result);
          }
        });
    }
  ],
  function(err, results) {
    if (err) {
      broker.log.error(err);
      next(err);
    } else {
      broker.log.info('All the service offerings and plans are collected.');
      broker.on('catalog', function(next) {
        var reply = {};
        reply.services = results;
        next(null, reply);
      });
    }
  });

broker.start();