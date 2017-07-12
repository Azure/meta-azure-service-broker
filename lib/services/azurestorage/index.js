/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var HttpStatus = require('http-status-codes');
var storageClient = require('./storageclient');
var common = require('../../common/');
var config = require('./service');
var log = common.getLogger(config.name);

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  // translate deprecated format
  if (parameters['resource_group_name']) {
    parameters['resourceGroup'] = parameters['resource_group_name'];
    delete parameters['resource_group_name'];
  }
  if (parameters['storage_account_name']) {
    parameters['storageAccountName'] = parameters['storage_account_name'];
    delete parameters['storage_account_name'];
  }
  if (parameters['account_type']) {
    parameters['accountType'] = parameters['account_type'];
    delete parameters['account_type'];
  }
  
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_STORAGE', parameters);
  if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
    if (!parameters.storageAccountName) parameters.storageAccountName = common.generateName();
  }
  return parameters;
};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['storageAccountName'];
};

Handlers.catalog = function(params, next) {
  var availableEnvironments = ['AzureCloud', 'AzureGermanCloud', 'AzureChinaCloud', 'AzureUSGovernment'];
  if (availableEnvironments.indexOf(params.azure.environment) === -1) {
    return next(null);
  }
  
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(params, next) {
  log.debug('Provision params: %j', params);

  var reqParams = params.parameters || {};
  
  var reqParamsKey = ['resourceGroup', 'storageAccountName', 'location', 'accountType'];
  var errMsg = common.verifyParameters(reqParams, reqParamsKey);
  if (errMsg) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }
  
  var resourceGroupName = reqParams[reqParamsKey[0]];
  var storageAccountName = reqParams[reqParamsKey[1]];

  var groupParameters = {
    location: reqParams[reqParamsKey[2]]
  };
  var accountParameters = reqParams.parameters || {
    location: reqParams[reqParamsKey[2]],
    kind: 'Storage',
    sku: {
      name: reqParams[reqParamsKey[3]],
    }
  };
  
  accountParameters['tags'] = common.mergeTags(reqParams.tags);

  storageClient.init(params.azure);

  storageClient.provision(resourceGroupName, groupParameters,
    storageAccountName, accountParameters,
    function(err, result) {
      if (err) {
        common.handleServiceError(err, next);
      } else {
        var reply = {
          statusCode: HttpStatus.ACCEPTED,
          code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          value: {}
        };
        next(null, reply, result);
      }
    });
};

Handlers.poll = function(params, next) {
  log.debug('Poll params: %j', params);

  var lastOperation = params.last_operation;
  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageClient.init(params.azure);

  storageClient.poll(resourceGroupName, storageAccountName, function(err, state) {
    var reply = {
      state: '',
      description: '',
    };

    if (lastOperation == 'provision') {
      if (err) {
        return common.handleServiceError(err, function(error) {
          next(error, lastOperation);
        });
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
          return common.handleServiceError(err, function(error) {
            next(error, lastOperation);
          });
        }

        reply.state = 'succeeded';
        reply.description = 'Deleted the storage account';
      } else {
        reply.state = 'in progress';
        reply.description = 'Deleting the storage account';
      }
    } else {
      var err = new Error('Unknown lastOperation: ' + lastOperation);
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    }

    reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: reply,
    };
    return next(null, lastOperation, reply, provisioningResult);
  });
};

Handlers.deprovision = function(params, next) {
  log.debug('Deprovision params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageClient.init(params.azure);

  storageClient.deprovision(resourceGroupName, storageAccountName, function(err) {
    if (err) {
      return common.handleServiceError(err, next);
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

Handlers.bind = function(params, next) {
  log.debug('Bind params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupResult.resourceGroupName;
  var storageAccountName = provisioningResult.storageAccountResult.storageAccountName;

  storageClient.init(params.azure);

  storageClient.bind(resourceGroupName, storageAccountName,
    function(err, primaryAccessKey, secondaryAccessKey) {
      if (err) {
        common.handleServiceError(err, next);
      } else {
        var reply = {
          statusCode: HttpStatus.CREATED,
          code: HttpStatus.getStatusText(HttpStatus.CREATED),
          value: {
            credentials: {
              storage_account_name: storageAccountName,
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

Handlers.unbind = function(params, next) {
  log.debug('Unbind params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  var result = {};
  next(null, reply, result);
};

module.exports = Handlers;

