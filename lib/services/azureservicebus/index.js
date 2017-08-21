/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');
var HttpStatus = require('http-status-codes');
var utils = require('./utils');
var common = require('../../common/');
var config = require('./service');
var log = common.getLogger(config.name);
var util = require('util');
var resourceGroup = require('../../common/resourceGroup-client');

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  // translate deprecated format
  if (parameters['resource_group_name']) {
    parameters['resourceGroup'] = parameters['resource_group_name'];
    delete parameters['resource_group_name'];
  }
  if (parameters['namespace_name']) {
    parameters['namespaceName'] = parameters['namespace_name'];
    delete parameters['namespace_name'];
  }
  
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_SERVICEBUS', parameters);
  if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
    if (!parameters.namespaceName) parameters.namespaceName = common.generateName();
  }
  return parameters;
};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['namespaceName'];
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

  var reqParamsKey = ['resourceGroup', 'namespaceName', 'location'];
  var errMsg = common.verifyParameters(reqParams, reqParamsKey);
  if (errMsg) {
      return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }

  var azure_config = {
    resourceGroupName: reqParams['resourceGroup'],
    namespaceName: reqParams['namespaceName'],
    location: reqParams['location'],
    tags: common.mergeTags(reqParams.tags)
  };
  
  var planId = params.plan_id;
  config.plans.forEach(function (item) {
    if (planId === item.id) {
      azure_config.tier = item.name;
    }
  });
  utils.init(params.azure);

  async.waterfall([
    function(callback) {
      utils.checkNamespaceAvailability(azure_config, callback);
    },
    function(callback) {
      resourceGroup.checkExistence(config.name, params.azure, azure_config.resourceGroupName, callback);
    },
    function(existed, callback) {
      if (existed) {
        callback(null);
      } else {
        resourceGroup.createOrUpdate(config.name, params.azure, azure_config.resourceGroupName, {location: azure_config.location}, callback);
      }
    },
    function(callback) {
      utils.createNamespace(azure_config, callback);
    }
  ], function(err) {
    if (err) {
      return common.handleServiceError(err, next);
    }
    var reply = {
      statusCode: HttpStatus.ACCEPTED,
      code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
      value: {}
    };
    var result = {
      resourceGroupName: azure_config.resourceGroupName,
      namespaceName: azure_config.namespaceName
    };
    next(null, reply, result);
  });
};

Handlers.poll = function(params, next) {
  log.debug('Poll params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.checkNamespaceStatus(azure_config, function(err, provisioningState) {
    var reply = {
      state: '',
      description: '',
    };

    var lastOperation = params.last_operation;
    if (lastOperation == 'provision') {
      if (err) {
        return common.handleServiceError(err, function(error) {
          next(error, lastOperation);
        });
      }
      log.info('Getting the provisioning state of the namespace %s: %j', namespaceName, provisioningState);

      if (provisioningState == 'Succeeded') {
        reply.state = 'succeeded';
        reply.description = 'Creating the namespace, state: ' + provisioningState;
      } else if (provisioningState == 'Failed') {
        var err = new Error('Failed to provision the namespace');
        return common.handleServiceError(err, function(error) {
          next(error, lastOperation);
        });
      } else {
        reply.state = 'in progress';
        reply.description = 'Creating the namespace, provisioningState: ' + provisioningState;
      }
    } else if (lastOperation == 'deprovision') {
      if (!err) {
        reply.state = 'in progress';
        reply.description = 'Deleting the namespace';
      } else if (err.statusCode == HttpStatus.NOT_FOUND) {
        reply.state = 'succeeded';
        reply.description = 'Deleting the namespace';
      } else {
        return common.handleServiceError(err, function(error) {
          next(error, lastOperation);
        });
      }
    }
    reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: reply,
    };
    next(null, lastOperation, reply, provisioningResult);
  });

};

Handlers.deprovision = function(params, next) {
  log.debug('Deprovision params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.delNamespace(azure_config, function(err) {
    if (err) {
      common.handleServiceError(err, next);
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
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.listNamespaceKeys(azure_config, function(err, keyName, keyValue) {
    if (err) {
      return common.handleServiceError(err, next);
    } else {
      var endpointSuffix;
      switch (params.azure.environment) {
        case 'AzureCloud':
          endpointSuffix = '.servicebus.windows.net';
          break;
        case 'AzureGermanCloud':
          endpointSuffix = '.servicebus.cloudapi.de';
          break;
        case 'AzureChinaCloud':
          endpointSuffix = '.servicebus.chinacloudapi.cn';
          break;
        case 'AzureUSGovernment':
          endpointSuffix = '.servicebus.usgovcloudapi.net';
          break;
      }
      var connectionString = util.format('Endpoint=sb://%s%s/;SharedAccessKeyName=%s;SharedAccessKey=%s',
                                          namespaceName,
                                          endpointSuffix,
                                          keyName,
                                          keyValue);
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            namespace_name: namespaceName,
            shared_access_key_name: keyName,
            shared_access_key_value: keyValue,
            connection_string: connectionString
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
