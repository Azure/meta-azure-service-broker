/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var request = require('request');
var common = require('../../common');

var API_VERSIONS;
var environment;
var azure_properties;
var azure_config;

String.prototype.format = function() {
    var formatted = this;
    for (var arg = 0; arg < arguments.length; arg++) {
        formatted = formatted.replace('{' + arg + '}', arguments[arg]);
    }
    return formatted;
};

exports.init = function(properties, config) {
  azure_properties = properties;
  azure_config = config;

  var environmentName = azure_properties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

exports.getToken = function(callback) {
  request({
    url: '{0}/{1}/oauth2/token'.format(environment.activeDirectoryEndpointUrl, azure_properties.tenant_id),
    qs: {'api-version' : API_VERSIONS.TOKEN},
    method: 'POST',
    headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
        'grant_type': 'client_credentials',
        'client_id': azure_properties.client_id,
        'client_secret': azure_properties.client_secret,
        'resource': environment.resourceManagerEndpointUrl,
        'scope': 'user_impersonation'
    }
  }, function(err, response, body){
    if(err) {
        callback(err);
    } else {
        if (response.statusCode == 200) {
          var b = JSON.parse(body);
          callback(null, b.access_token);
        } else {
          var e = new Error(body);
          e.statusCode = response.statusCode;
          callback(e);
        }
    }
  });
};

exports.createResourceGroup = function(accessToken, callback){
  request({
    url: '{0}/subscriptions/{1}/resourceGroups/{2}'.format(environment.resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName),
    qs: {'api-version' : API_VERSIONS.RESOURCE_GROUP},
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken 
    },
    json: {
        'location': azure_config.location
    }
}, function(err, response, body){
     if(err) {
         callback(err);
     } else {
         if (response.statusCode == 200 || response.statusCode == 201)
             callback(null, accessToken);
         else {
             var e = new Error(JSON.stringify(body));
             e.statusCode = response.statusCode;
             callback(e);
         }
     }
  });
};

exports.createNamespace = function(accessToken, callback) {
  request({
    url: '{0}/subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(environment.resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
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
  }, function(err, response, body){
       if(err) {
           callback(err);
       } else {
           if (response.statusCode == 200)
               callback(null, azure_config.resourceGroupName, azure_config.namespaceName);
           else {
               var e = body.error;
               e.statusCode = response.statusCode;
               e.code = body.error.code;
               e.message = body.error.message;
               callback(e);
           }
       }
  });
};

exports.getNamespace = function(accessToken, callback) {
  request({
    url: '{0}/subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(environment.resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body){
       if(err) {
           callback(err);
       } else {
           if (response.statusCode == 200) {
               var b = JSON.parse(body);
               callback(null, b.properties.provisioningState);
           }
           else {
               var b = JSON.parse(body);
               var e = b.error;
               e.statusCode = response.statusCode;
               callback(e);
           }
       }
  });
};

exports.listNamespaceKeys = function(accessToken, callback) {
  request({
    url: '{0}/subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}/authorizationRules/RootManageSharedAccessKey/ListKeys'.format(environment.resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body){
       if(err) {
           callback(err);
       } else {
           if (response.statusCode == 200) {
               var b = JSON.parse(body);
               callback(null, 'RootManageSharedAccessKey', b.primaryKey);
           }
           else {
               var b = JSON.parse(body);
               var e = b.error;
               e.statusCode = response.statusCode;
               callback(e);
           }
       }
  });
};

exports.delNamespace = function(accessToken, callback) {
  request({
    url: '{0}/subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(environment.resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSIONS.SERVICE_BUS_NAMESPACE},
    method: 'DELETE',
    headers: {
        'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body){
       if(err) {
           callback(err);
       } else {
           if (response.statusCode == 202) {
               callback(null);
           }
           else {
               var e = new Error(JSON.stringify(body));
               e.statusCode = response.statusCode;
               callback(e);
           }
       }

  });
};
