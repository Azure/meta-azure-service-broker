/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var util = require('util');
var common = require('../../common');
var resourceGroup = require('../../common/resourceGroup-client');
var msRestRequest = require('../../common/msRestRequest');
var HttpStatus = require('http-status-codes');

var API_VERSIONS;
var environment;
var azureProperties;
var namespaceUrlTemplate = '%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, namespaceName
exports.init = function(azure) {
  azureProperties = azure;

  var environmentName = azureProperties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

exports.createResourceGroup = function(azureConfig, callback) {
  resourceGroup.createOrUpdate(
    'ServiceBus',
    azureProperties,
    azureConfig.resourceGroupName,
    { 'location': azureConfig.location },
    callback
  );
};

exports.createNamespace = function(azureConfig, callback) {
  msRestRequest.PUT(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders('ServiceBus - createNamespace', {}),
    {
      'location': azureConfig.location,
      'kind': azureConfig.sbType,
      'sku': {
        'name': 'StandardSku',
        'tier': azureConfig.sbTier
      },
      'tags': azureConfig.tags,
      'properties': {
      }
    },
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(response, 'ServiceBus - createNamespace', true);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.OK) {
          callback(null);
        } else {
          return common.formatErrorFromRes(response, callback);
        }
      }
    }
  );
};

function getNamespace(azureConfig, callback) {
  msRestRequest.GET(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders('ServiceBus - getNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    callback
  );
}

exports.checkNamespaceAvailability = function(azureConfig, callback) {
  getNamespace(azureConfig, function(err, response, body) {
    common.logHttpResponse(response, 'Check namespace availability', true);
    if (err) {
      callback(err);
    } else {
      switch (response.statusCode) {
        case HttpStatus.NOT_FOUND:
          callback(null);
          break;
        case HttpStatus.OK:
          var error = new Error('The namespace name is not available.');
          error.statusCode = HttpStatus.CONFLICT;
          callback(error);
          break;
        default:
          return common.formatErrorFromRes(response, callback);
      }
    }
  });
};

exports.checkNamespaceStatus = function(azureConfig, callback) {
  getNamespace(azureConfig, function(err, response, body) {
    common.logHttpResponse(response, 'Check namespace Status', true);
    if(err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        callback(null, b.properties.provisioningState);
      } else {
        return common.formatErrorFromRes(response, callback);
      }
    }
  });
};

exports.listNamespaceKeys = function(azureConfig, callback) {
  msRestRequest.POST(
    util.format(
      namespaceUrlTemplate + '/authorizationRules/RootManageSharedAccessKey/ListKeys',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders('ServiceBus - listNamespaceKeys', {}),
    null,
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(response, 'ServiceBus - listNamespaceKeys', false);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.OK) {
          var b = JSON.parse(body);
          callback(null, 'RootManageSharedAccessKey', b.primaryKey);
        } else {
          return common.formatErrorFromRes(response, callback);
        }
      }
    }
  );
};

exports.delNamespace = function(azureConfig, callback) {
  msRestRequest.DELETE(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders('ServiceBus - deleteNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(response, 'ServiceBus - deleteNamespace', true);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.ACCEPTED || response.statusCode == HttpStatus.NO_CONTENT) {
          callback(null);
        } else {
          return common.formatErrorFromRes(response, callback);
        }
      }
    }
  );
};
