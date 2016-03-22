/*jshint camelcase: false */

'use strict';

var util = require('util');
var Net = require('net');
var Url = require('url');

/* Extends an objects properties with anothers */
module.exports.extend = function(target, source) {
  if (source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        var val = source[key];
        if (typeof val !== 'undefined') {
          target[key] = val;
        }
      }
    }
  }
  return target;
};

module.exports.validateEnvironmentVariables = function() {
  var envs = [];
  if (!process.env['environment']) envs.push('environment');
  if (!process.env['subscription_id']) envs.push('subscription_id');
  if (!process.env['tenant_id']) envs.push('tenant_id');
  if (!process.env['client_id']) envs.push('client_id');
  if (!process.env['client_secret']) envs.push('client_secret');
  if (envs.length > 0) {
    throw new Error(util.format(
      'please set/export the following environment variables: %s', envs.toString()
    ));
  }
};

module.exports.getCredentialsAndSubscriptionId = function() {
  var environment = process.env['environment'];
  var subscriptionId = process.env['subscription_id'];
  var tenantId = process.env['tenant_id'];
  var clientId = process.env['client_id'];
  var clientSecret = process.env['client_secret'];
  return {
    environment: environment,
    subscription_id: subscriptionId,
    tenant_id: tenantId,
    client_id: clientId,
    client_secret: clientSecret,
  };
};