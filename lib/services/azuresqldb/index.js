/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var Config = require('./service');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');

var Handlers = {};

Handlers.catalog = function(log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function(log, params, next) {
};

Handlers.deprovision = function(log, params, next) {
};

Handlers.poll = function(log, params, next) {
};

Handlers.bind = function(log, params, next) {
};

Handlers.unbind = function(log, params, next) {
};

module.exports = Handlers;
