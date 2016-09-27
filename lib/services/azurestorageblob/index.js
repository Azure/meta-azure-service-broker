/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var storageBlobClient = require('./storageblobclient');
var config = require('./service');
var common = require('../../common/');

var ServiceError = function(err) {
  var error = {};
  if (_.has(err, 'statusCode')) {
    error = {
      statusCode: err.statusCode,
      code: err.code,
      description: err.message,
    };
  } else {
    error = {
      statusCode: HttpStatus.BAD_REQUEST,
      code: HttpStatus.getStatusText(HttpStatus.BAD_REQUEST),
      description: err.message,
    };
  }
  return error;
};

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['storage_account_name'];
};

Handlers.catalog = function(log, params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(log, params, next) {
  log.debug('Provision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};
  
  var reqParamsKey = ['resource_group_name', 'storage_account_name', 'container_name', 'location', 'account_type'];
  var len = reqParamsKey.length;
  for (var i = 0; i<len; i++) {
    if (!_.has(reqParams, reqParamsKey[i])) {
      var err = new Error(reqParamsKey[i] + ' in configuration needed.');
      err.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      next(err);
      return;
    }
  }
  
  var resourceGroupName = reqParams[reqParamsKey[0]];
  var storageAccountName = reqParams[reqParamsKey[1]];

  var groupParameters = {
    location: reqParams[reqParamsKey[3]]
  };
  var accountParameters = reqParams.parameters || {
    location: reqParams[reqParamsKey[3]],
    accountType: reqParams[reqParamsKey[4]],
  };
  accountParameters['tags'] = common.mergeTags(reqParams.tags);

  storageBlobClient.init(params.azure, log);

  storageBlobClient.provision(resourceGroupName, groupParameters,
    storageAccountName, accountParameters,
    function(err, results) {
      if (err) {
        var error = ServiceError(err);
        log.error('%j', error);
        return next(error);
      } else {
        var reply = {
          statusCode: HttpStatus.ACCEPTED,
          code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          value: {}
        };
        var result = {
          resourceGroupResult: results[0],
          storageAccountResult: results[1]
        };
        next(null, reply, result);
      }
    });
};

Handlers.poll = function(log, params, next) {
  log.debug('Poll params: %j', params);

  var lastOperation = params.last_operation;
  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageBlobClient.init(params.azure, log);

  storageBlobClient.poll(resourceGroupName, storageAccountName, function(err, state) {
    var reply = {
      state: '',
      description: '',
    };

    if (lastOperation == 'provision') {
      if (err) {
        var error = ServiceError(err);
        log.error(error);
        return next(error, lastOperation);
      }

      log.info('Getting the provisioning state of the storage account %s: %j', storageAccountName, state);
      if (state == 'Succeeded') {
        reply.state = 'succeeded';
        reply.description = 'Created the storage account, state: ' + state;
      } else {
        reply.state = 'in progress';
        reply.description = 'Creating the storage account, state: ' + state;
      }
    } else if (lastOperation == 'deprovision') {
      if (err) {
        if (err.statusCode != HttpStatus.NOT_FOUND) {
          var error = ServiceError(err);
          log.error(error);
          return next(error, lastOperation);
        }

        reply.state = 'succeeded';
        reply.description = 'Deleted the storage account';
      } else {
        reply.state = 'in progress';
        reply.description = 'Deleting the storage account';
      }
    } else {
      var error = ServiceError('Unknown lastOperation: ' + lastOperation);
      log.error(error);
      return next(error, lastOperation);
    }

    reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: reply,
    };
    return next(null, lastOperation, reply, provisioningResult);
  });
};

Handlers.deprovision = function(log, params, next) {
  log.debug('Deprovision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageBlobClient.init(params.azure, log);

  storageBlobClient.deprovision(resourceGroupName, storageAccountName, function(err) {
    if (err) {
      var error = ServiceError(err);
      log.error(error);
      return next(error);
    } else {
      var reply = {
        statusCode: HttpStatus.ACCEPTED,
        code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
        value: {}
      };
      next(null, reply, provisioningResult);
    }
  });
};

Handlers.bind = function(log, params, next) {
  log.debug('Bind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var containerName = reqParams.container_name;

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageBlobClient.init(params.azure, log);

  storageBlobClient.bind(resourceGroupName, storageAccountName, containerName,
    function(err, primaryAccessKey, secondaryAccessKey) {
      if (err) {
        var error = ServiceError(err);
        log.error(error);
        return next(error);
      } else {
        var reply = {
          statusCode: HttpStatus.CREATED,
          code: HttpStatus.getStatusText(HttpStatus.CREATED),
          value: {
            credentials: {
              storage_account_name: storageAccountName,
              container_name: containerName,
              primary_access_key: primaryAccessKey,
              secondary_access_key: secondaryAccessKey,
            }
          },
        };
        var result = {};
        next(null, reply, result);
      }
    });
};

Handlers.unbind = function(log, params, next) {
  log.debug('Unbind params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageBlobClient.init(params.azure, log);

  storageBlobClient.unbind(resourceGroupName, storageAccountName, function(err) {
    if (err) {
      var error = ServiceError(err);
      log.error(error);
      return next(error);
    } else {
      var reply = {
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: {},
      };
      var result = {};
      next(null, reply, result);
    }
  });
};

module.exports = Handlers;
