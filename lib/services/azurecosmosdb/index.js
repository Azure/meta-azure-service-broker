/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var HttpStatus = require('http-status-codes');

var Config = require('./service');
var common = require('../../common/');

var log = common.getLogger(Config.name);

var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind');
var cosmosDbClient = require('./client');
var Reply = require('../../common/reply');
var _ = require('underscore');
var util = require('util');

var Handlers = {};

Handlers.catalog = function(params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['cosmosDbAccountName'];
};

Handlers.provision = function(params, next) {

  log.debug('CosmosDb/index/provision/params: %j', params);

  var cp = new cmdProvision(params);
  var reqParams = params.parameters;
  
  var acceptableKinds = ['Graph', 'DocumentDB', 'Table', 'MongoDB'];
  if (reqParams.kind && acceptableKinds.indexOf(reqParams.kind) === -1) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, 'No such kind of API.', next);
  }
  
  var errMsg = cp.verifyParameters();
  if (errMsg) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }

  cosmosDbClient.initialize(params.azure);
  cp.provision(cosmosDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.poll = function(params, next) {

  log.debug('CosmosDb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;

  var cp = new cmdPoll(params);

  cosmosDbClient.initialize(params.azure);
  cp.poll(cosmosDbClient, function(err, reply, provisioningResult) {
    if (err) {
      common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, reply, provisioningResult);
    }
  });
};

Handlers.deprovision = function(params, next) {

  log.debug('CosmosDb/index/deprovision/params: %j', params);

  var cp = new cmdDeprovision(params);

  cosmosDbClient.initialize(params.azure);
  cp.deprovision(cosmosDbClient, function(err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, Reply(HttpStatus.ACCEPTED), result);
    }
  });
};

Handlers.bind = function(params, next) {

  log.debug('CosmosDb/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;

  var cp = new cmdBind(params);
  var reqParams = params.parameters;
  
  cosmosDbClient.initialize(params.azure);
  cp.bind(cosmosDbClient, function(err, masterKey, readonlyMasterKey) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {}
      };
      if (reqParams.kind === 'MongoDB') {
        reply.value.credentials = {
          // known issue: the port of host endpoint is 443 though the kind of account is MongoDB. The port is supposed to be 10255. https://docs.microsoft.com/en-us/azure/cosmos-db/connect-mongodb-account
          cosmosdb_host_endpoint: provisioningResult.hostEndpoint.replace(':443', ':10255'),
          cosmosdb_username: reqParams.cosmosDbAccountName,
          cosmosdb_password: masterKey,
          cosmosdb_readonly_password: masterKey
        };
        _.extend(reply.value.credentials, 
          {
            cosmosdb_connection_string:
              util.format('mongodb://%s:%s@%s?ssl=true&replicaSet=globaldb',
                           reply.value.credentials.cosmosdb_username,
                           reply.value.credentials.cosmosdb_password,
                           reply.value.credentials.cosmosdb_host_endpoint.slice(8) // remove "https://"
              ),
            cosmosdb_readonly_connection_string:
              util.format('mongodb://%s:%s@%s?ssl=true&replicaSet=globaldb',
                           reply.value.credentials.cosmosdb_username,
                           reply.value.credentials.cosmosdb_readonly_password,
                           reply.value.credentials.cosmosdb_host_endpoint.slice(8) // remove "https://"
              )
          }
        );
      } else {
        reply.value.credentials = {
          cosmosdb_host_endpoint: provisioningResult.hostEndpoint,
          cosmosdb_master_key: masterKey,
          cosmosdb_readonly_master_key: readonlyMasterKey,
          cosmosdb_database_id: provisioningResult.database.id,
          cosmosdb_database_link: provisioningResult.database._self
        };
      }
      next(null, reply, {});
    }
  });
};

Handlers.unbind = function(params, next) {

  log.debug('CosmosDb/index/unbind/params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  var result = {};
  next(null, reply, result);
};

module.exports = Handlers;

