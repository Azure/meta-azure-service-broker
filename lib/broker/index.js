'use strict';

var Semver = require('semver');
var Events = require('events');
var Util = require('util');

/**
 * The primary broker class
 * @constructor
 * @param {Object} opts - Broker options.
 */
var Broker = function(opts) {
  var missingOpts = [];

  var requiredOpts = {
    serviceBroker: Object,
    database: Object
  };

  if (!opts) {
    throw new Error('Options not supplied to the broker');
  }

  for (var opt in requiredOpts) {
    if (requiredOpts.hasOwnProperty(opt)) {
      if (!opts.hasOwnProperty(opt)) {
        missingOpts.push(opt);
      }
    }
  }

  if (missingOpts.length > 0) {
    throw new Error('Missing options: ' + missingOpts.join(', '));
  }

  var apiVersion = '2.8.0';
  opts.port = process.env.PORT || 5001;

  opts.semver = Semver.parse(apiVersion);
  opts.version = opts.semver.major;
  opts.name = 'Meta Azure Service Broker';

  var Broker;

  if (opts.semver.major === 2) {
    Broker = require('./v2');
  } else {
    throw new Error('Unsupported service API version: ' + apiVersion);
  }

  return new Broker(opts);
};

/* Must inherit here, before custom prototypes are assigned */
Util.inherits(Broker, Events.EventEmitter);

module.exports = Broker;
