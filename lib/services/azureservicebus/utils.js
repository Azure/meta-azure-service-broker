/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var resourceManagerEndpointUrl;
var activeDirectoryEndpointUrl;

var request = require('request');

var azure_properties;
var azure_config;

var API_VERSION_FOR_TOKEN = '2015-05-01-preview';
var API_VERISON_FOR_RESOURCE_GROUP = '2015-11-01';
var API_VERSION_FOR_NAMESPACE = '2015-08-01';

String.prototype.format = function() {
    var formatted = this;
    for( var arg = 0; arg < arguments.length; arg++) {
        formatted = formatted.replace('{' + arg + '}', arguments[arg]);
    }
    return formatted;
};

exports.init = function(properties, config) {
  azure_properties = properties;
  azure_config = config;
  if (azure_properties.environment == 'AzureChinaCloud') {
    resourceManagerEndpointUrl = 'https://management.chinacloudapi.cn/';
    activeDirectoryEndpointUrl = 'https://login.chinacloudapi.cn/';
  } else {
    resourceManagerEndpointUrl = 'https://management.azure.com/';
    activeDirectoryEndpointUrl = 'https://login.windows.net/';
  }
};

exports.getToken = function(callback) {
  request({
    url: '{0}{1}/oauth2/token'.format(activeDirectoryEndpointUrl, azure_properties.tenant_id),
    qs: {'api-version' : API_VERSION_FOR_TOKEN},
    method: 'POST',
    headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
        'grant_type': 'client_credentials',
        'client_id': azure_properties.client_id,
        'client_secret': azure_properties.client_secret,
        'resource': resourceManagerEndpointUrl,
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
          callback(new Error(body));
        }
    }
  });
};

exports.createResourceGroup = function(accessToken, callback){
  request({
    url: '{0}subscriptions/{1}/resourceGroups/{2}'.format(resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName),
    qs: {'api-version' : API_VERISON_FOR_RESOURCE_GROUP},
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
         if (body.properties.provisioningState === 'Succeeded')
             callback(null, accessToken);
         else
             callback(new Error(body));
     }
  });
};

exports.createNamespace = function(accessToken, callback) {
  request({
    url: '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSION_FOR_NAMESPACE},
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
        'properties': {
        }
    }
  }, function(err, response, body){
       if(err) {
           callback(err);
       } else {
           if (response.statusCode == 200)
               callback(null, azure_config.resourceGroupName, azure_config.NamespaceName);
           else
               callback(new Error(body));
       }
  });
};

exports.getNamespace = function(accessToken, callback) {
  request({
    url: '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSION_FOR_NAMESPACE},
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
               var e = new Error(body);
               e.statusCode = response.statusCode;
               callback(e);
           }
       }
  });
};

exports.listNamespaceKeys = function(accessToken, callback) {
  request({
    url: '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}/authorizationRules/RootManageSharedAccessKey/ListKeys'.format(resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSION_FOR_NAMESPACE},
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
           else
               callback(new Error(body));
       }
  });
};

exports.delNamespace = function(accessToken, callback) {
  request({
    url: '{0}subscriptions/{1}/resourceGroups/{2}/providers/Microsoft.ServiceBus/namespaces/{3}'.format(resourceManagerEndpointUrl, azure_properties.subscription_id, azure_config.resourceGroupName, azure_config.namespaceName),
    qs: {'api-version' : API_VERSION_FOR_NAMESPACE},
    method: 'DELETE',
    headers: {
        'Authorization': 'Bearer ' + accessToken
    }
  }, function(err, response, body){
       callback(err);
  });
};
