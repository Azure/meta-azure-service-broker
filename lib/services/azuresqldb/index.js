/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var cmdProvision = require('./cmd-provision');
var sqldbOperations = require('./client');
var resourceGroupClient = require('../../common/resourceGroup-client');
var Reply = require('../../common/reply');

var Handlers = {};

Handlers.catalog = function (log, params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (log, params, next) {

  // log.muteOnly('debug');

  log.debug('SqlDb/index/provision/params: %j', params);

  var cp = new cmdProvision(log, params);
  log.debug('sqldb index: cmdProvision is newed up');
  if (!cp.allValidatorsSucceed()) {
    var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR);
    reply.value.description = 'Input validators failed.';
    var err = new Error('Parameter validation failed.  Did you supply the parameters file?');
    err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    next(err, reply, null);
    return;
  }

  resourceGroupClient.instantiate(params.azure);
  log.debug('sqldb index: resourceGroupClient is instantiated');

  var sqldbOps = new sqldbOperations(log, params.azure);
  log.debug('sqldb index: sqldbOps is newed up');
  
  cp.provision(sqldbOps, resourceGroupClient, function(err, result) {
    if (err) {
      var statusCode = null;
      if (_.has(err, 'statusCode')) statusCode = err.statusCode;
      var reply = Reply(HttpStatus.INTERNAL_SERVER_ERROR, statusCode, err.code);
      if (reply.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      next(err, reply, result);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.deprovision = function (log, params, next) {
};

Handlers.poll = function (log, params, next) {
};

Handlers.bind = function (log, params, next) {
};

Handlers.unbind = function (log, params, next) {
};

module.exports = Handlers;
