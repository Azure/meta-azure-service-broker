'use strict';

var fs = require('fs');
var path = require('path');
var common = require('./lib/common');
var msRestRequest = require('./lib/common/msRestRequest');
var Broker = require('./lib/broker');

global.modules = {};

var config = common.getConfigurations();
var broker = new Broker(config);
var log = common.getLogger(common.LOG_CONSTANTS.BROKER);

msRestRequest.init(config.azure);

// Brokers listen for '<operation>-<serviceId>' ex: 'poll-fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5'
var addListeners = function(serviceId, serviceModule) {
  var operations = ['provision', 'poll', 'deprovision', 'bind', 'unbind', 'update'];
  operations.forEach(function(operation) {
    if (serviceModule.hasOwnProperty(operation)){
      log.debug('Adding listener %s-%s', operation, serviceId);
      broker.on(operation + '-' + serviceId, serviceModule[operation]);
    }
  });
};

log.info('Starting to collect the service offering and plans of each service module...');

var params = {};
params.azure = config.azure;

var servicesPath = path.resolve(__dirname, 'lib/services');
var services = [];

fs.readdir(servicesPath, function(err, files) {
  if (err) {
    throw err;
  }

  files.map(function(file) {
    return path.join(servicesPath, file);
  }).filter(function(file) {
    return fs.statSync(file).isDirectory();
  }).forEach(function(file) {
    var serviceModule = require(file);
    serviceModule.catalog(params, function(err, service) {
      if (err) {
        throw err;
      } else {
        log.info('Adding listeners for the service %s...', service.name);
        addListeners(service.id, serviceModule);
        services.push(service);
        global.modules[service.id] = serviceModule;
      }
    });
  });
});

broker.on('catalog', function(callback) {
  var reply = {};
  reply.services = services;
  callback(reply);
});

module.exports = broker;
