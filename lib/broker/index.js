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
    apiVersion: String,
    authUser: String,
    authPassword: String,
    database: Object,
    name: String,
    port: Number
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

  opts.port = process.env.PORT || opts.port;

  opts.semver = Semver.parse(opts.apiVersion);
  opts.version = opts.semver.major;

  var Broker;

  if (opts.semver.major === 2) {
    Broker = require('./v2');
  }

  if (!Broker) {
    throw new Error('Unsupported service API version: ' + opts.apiVersion);
  }

  return new Broker(opts);
};

/* Must inherit here, before custom prototypes are assigned */
Util.inherits(Broker, Events.EventEmitter);

module.exports = Broker;