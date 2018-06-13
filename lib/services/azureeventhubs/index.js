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

// Space Scoping if enabled needs unique names in multi-tenant environments
config = common.fixNamesIfSpaceScopingEnabled(config);

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_EVENTHUBS', parameters);
  if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
    if (!parameters.namespaceName) parameters.namespaceName = common.generateName();
    if (!parameters.eventHubName) parameters.eventHubName = common.generateName();
  }
  return parameters;
};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['namespaceName'];
};

Handlers.catalog = function(params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(params, next) {
  log.debug('Provision params: %j', params);

  var reqParams = params.parameters || {};

  var reqParamsKey = ['resourceGroup', 'location', 'namespaceName', 'eventHubName'];
  var errMsg = common.verifyParameters(reqParams, reqParamsKey);
  if (errMsg) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }

  var azure_config = {
    resourceGroupName: reqParams['resourceGroup'],
    location: reqParams['location'],
    namespaceName: reqParams['namespaceName'],
    eventHubName: reqParams['eventHubName'],
    eventHubProperties: reqParams['eventHubProperties'],
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
      namespaceName: azure_config.namespaceName,
      eventHubName: azure_config.eventHubName,
      eventHubProperties: azure_config.eventHubProperties
    };
    next(null, reply, result);
  });
};

Handlers.poll = function(params, next) {
  log.debug('Poll params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;
  var eventHubName = provisioningResult.eventHubName;
  var eventHubProperties = provisioningResult.eventHubProperties;
      
  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
    eventHubName: eventHubName,
    eventHubProperties: eventHubProperties
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
        utils.createEventHub(azure_config, function(error) {
          if (error) {
            return next(error, lastOperation);
          }
          reply.state = 'succeeded';
          reply.description = 'Created the namespace. Created event hub.';
          reply = {
            statusCode: HttpStatus.OK,
            code: HttpStatus.getStatusText(HttpStatus.OK),
            value: reply,
          };
          next(null, lastOperation, reply, provisioningResult);
        });
      } else if (provisioningState == 'Failed') {
        var err = new Error('Failed to provision the namespace');
        return common.handleServiceError(err, function(error) {
          next(error, lastOperation);
        });
      } else {
        reply.state = 'in progress';
        reply.description = 'Creating the namespace, provisioningState: ' + provisioningState;
        reply = {
          statusCode: HttpStatus.OK,
          code: HttpStatus.getStatusText(HttpStatus.OK),
          value: reply,
        };
        next(null, lastOperation, reply, provisioningResult);
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
      reply = {
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: reply,
      };
      next(null, lastOperation, reply, provisioningResult);
    }
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
  var eventHubName = provisioningResult.eventHubName;
  
  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName
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
      var namespaceConnectionString = 
        util.format('Endpoint=sb://%s%s/;SharedAccessKeyName=%s;SharedAccessKey=%s',
                     namespaceName,
                     endpointSuffix,
                     keyName,
                     keyValue);
      var eventhubConnectionString = namespaceConnectionString + ';EntityPath=' + eventHubName;
      
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            namespace_name: namespaceName,
            event_hub_name: eventHubName,
            shared_access_key_name: keyName,
            shared_access_key_value: keyValue,
            namespace_connection_string: namespaceConnectionString,
            event_hub_connection_string: eventhubConnectionString
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
