/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var request = require('request');
var util = require('util');
var common = require('../../common');
var HttpStatus = require('http-status-codes');

var API_VERSIONS;
var environment;
var azure_properties;
var log;

exports.init = function(properties, logger) {
  log = logger;
  azure_properties = properties;

  var environmentName = azure_properties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

exports.getToken = function(azure_config, callback) {
  request({
    url: util.format('%s/%s/oauth2/token',
      environment.activeDirectoryEndpointUrl,
      azure_properties.tenantId),
    qs: {'api-version' : API_VERSIONS.TOKEN},
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
      'grant_type': 'client_credentials',
      'client_id': azure_properties.clientId,
      'client_secret': azure_properties.clientSecret,
      'resource': environment.resourceManagerEndpointUrl,
      'scope': 'user_impersonation'
    }
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'Get authorization token', false);
    if(err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        callback(null, azure_config, b.access_token);
      } else {
        var e = new Error(body);
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};

exports.createResourceGroup = function(azure_config, accessToken, callback) {
  request({
    url: util.format('%s/subscriptions/%s/resourceGroups/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName),
    qs: {'api-version' : API_VERSIONS.RESOURCE_GROUP},
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken 
    },
    json: {
      'location': azure_config.location
    }
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'Create or update resource group', true);
    if(err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.CREATED) {
        callback(null, azure_config, accessToken);
      } else {
        var e = new Error(JSON.stringify(body));
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};

exports.createNamespace = function(azure_config, accessToken, callback) {
  request({
    url: util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: {
      'location': azure_config.location,
      'kind': azure_config.sbType,
      'sku': {
        'name': 'StandardSku',
        'tier': azure_config.sbTier
      },
      'tags': azure_config.tags,
      'properties': {
      }
    }
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'Create namespace', true);
    if (err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK) {
        callback(null, azure_config.resourceGroupName, azure_config.namespaceName);
      } else {
        var e = body.error;
        e.statusCode = response.statusCode;
        e.code = body.error.code;
        e.message = body.error.message;
        callback(e);
      }
    }
  });
};

function getNamespace(azure_config, accessToken, callback) {
  request({
    url: util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body) {
    callback(err, response, body);
  });
}

exports.checkNamespaceAvailability = function(azure_config, accessToken, callback) {
  getNamespace(azure_config, accessToken,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'Check namespace availability', true);
      if(err) {
        callback(err);
      } else {
        switch (response.statusCode) {
          case HttpStatus.NOT_FOUND:
            callback(null, azure_config, accessToken);
            break;
          case HttpStatus.OK:
            var error = new Error('The namespace name is not available.');
            error.statusCode = HttpStatus.CONFLICT;
            callback(error);
            break;
          default:
            var error = new Error(response.body);
            error.statusCode = response.statusCode;
            callback(error);
        }
      }
    });
};

exports.checkNamespaceStatus = function(azure_config, accessToken, callback) {
  getNamespace(azure_config, accessToken,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'Check namespace Status', true);
      if(err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.OK) {
          var b = JSON.parse(body);
          callback(null, b.properties.provisioningState);
        } else {
          var b = JSON.parse(body);
          var e = b.error;
          e.statusCode = response.statusCode;
          callback(e);
        }
      }
    });
};

exports.listNamespaceKeys = function(azure_config, accessToken, callback) {
  request({
    url: util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s/authorizationRules/RootManageSharedAccessKey/ListKeys',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'List namespace keys', false);
    if (err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        callback(null, 'RootManageSharedAccessKey', b.primaryKey);
      } else {
        var b = JSON.parse(body);
        var e = b.error;
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};

exports.delNamespace = function(azure_config, accessToken, callback) {
  request({
    url: util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body) {
    common.logHttpResponse(log, response, 'Delete namespace', true);
    if (err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.ACCEPTED) {
        callback(null);
      } else {
        var e = new Error(JSON.stringify(body));
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};
