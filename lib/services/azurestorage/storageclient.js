/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');
var util = require('util');
var common = require('../../common');
var resourceGroup = require('../../common/resourceGroup-client');
var msRestRequest = require('../../common/msRestRequest');
var HttpStatus = require('http-status-codes');

var API_VERSIONS;
var environment;
var azureProperties;

var storageAccountUrlTemplate = '%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Storage/storageAccounts/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, storageAccountName
  
exports.init = function(azure) {
  azureProperties = azure;

  var environmentName = azureProperties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

function checkNameAvailability(storageAccountName, callback) {
  msRestRequest.POST(
    util.format(
      '%s/subscriptions/%s/providers/Microsoft.Storage/checkNameAvailability',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId),
    common.mergeCommonHeaders('Storage - checkNameAvailability', {}),
    {'name': storageAccountName, 'type':'Microsoft.Storage/storageAccounts'},
    API_VERSIONS.STORAGE_ACCOUNT,
    callback
  );
}
 
function createStorageAccount(resourceGroupName, storageAccountName, accountParameters, callback) {
  msRestRequest.PUT(
    util.format(
      storageAccountUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      storageAccountName),
    common.mergeCommonHeaders('Storage - createStorageAccount', {}),
    accountParameters,
    API_VERSIONS.STORAGE_ACCOUNT,
    callback
  );
}
 
exports.provision = function(resourceGroupName, groupParameters, storageAccountName, accountParameters, next) {
  async.series([
      function(callback) {
        checkNameAvailability(storageAccountName,
          function(err, response, body) {
            common.logHttpResponse(response, 'Storage - checkNameAvailability', true);
            if (err) {
              callback(err);
            } else {
              if (body.nameAvailable) {
                callback(null);
              } else {
                var error = new Error(body.message);
                if (body.reason === 'AccountNameInvalid') {
                  error.statusCode = HttpStatus.BAD_REQUEST;
                } else {
                  error.statusCode = HttpStatus.CONFLICT;
                }
                callback(error);
              }
            }
          }
        );
      },
      function(callback) {
        resourceGroup.createOrUpdate('Storage', azureProperties, resourceGroupName, groupParameters,
          function(err, response, body) {
            callback(err, {
              resourceGroupName: resourceGroupName,
              groupParameters: groupParameters,
            });
          }
        );
      },
      function(callback) {
        createStorageAccount(resourceGroupName, storageAccountName, accountParameters,
          function(err, response, body) {
            common.logHttpResponse(response, 'Storage - createStorageAccount', true);
            if (err) {
              return callback(err);
            }
            if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.ACCEPTED) {
              callback(null, {
                storageAccountName: storageAccountName,
                accountParameters: accountParameters,
              });
            } else {
              var e = new Error(body);
              e.statusCode = response.statusCode;
              callback(e);
            }
          }
        );
      }
    ],
    function(err, results) {
      var result = {
        resourceGroupResult: results[1],
        storageAccountResult: results[2]
      };
      next(err, result);
    });
};

function getProperties(resourceGroupName, storageAccountName, callback) {
  msRestRequest.GET(
    util.format(
      storageAccountUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      storageAccountName),
    common.mergeCommonHeaders('Storage - getProperties', {}),
    API_VERSIONS.STORAGE_ACCOUNT,
    callback
  );
}

exports.poll = function(resourceGroupName, storageAccountName, next) {
  getProperties(resourceGroupName, storageAccountName,
    function(err, response, body) {
      common.logHttpResponse(response, 'Storage - getProperties', true);
      if (err) {
        return next(err);
      }
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        next(null, b.properties.provisioningState);
      } else {
        var e = new Error(body);
        e.statusCode = response.statusCode;
        next(e);
      }
    }
  );
};

function deleteMethod(resourceGroupName, storageAccountName, callback) {
  msRestRequest.DELETE(
    util.format(
      storageAccountUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      storageAccountName),
    common.mergeCommonHeaders('Storage - deleteMethod', {}),
    API_VERSIONS.STORAGE_ACCOUNT,
    callback
  );
}

exports.deprovision = function(resourceGroupName, storageAccountName, next) {
  deleteMethod(resourceGroupName, storageAccountName,
    function(err, response, body) {
      common.logHttpResponse(response, 'Storage - deleteMethod', true);
      if (err) {
        return next(err);
      }
      if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.NO_CONTENT) {
        next(null);
      } else {
        var e = new Error(body);
        e.statusCode = response.statusCode;
        next(e);
      }
    }
  );
};

function listKeys(resourceGroupName, storageAccountName, callback) {
  msRestRequest.POST(
    util.format(
      storageAccountUrlTemplate + '/listKeys',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      storageAccountName),
    common.mergeCommonHeaders('Storage - listKeys', {}),
    null,
    API_VERSIONS.STORAGE_ACCOUNT,
    callback
  );
}

exports.bind = function(resourceGroupName, storageAccountName, next) {
  listKeys(resourceGroupName, storageAccountName,
    function(err, response, body) {
      common.logHttpResponse(response, 'Storage - listKeys', false);
      if (err) {
        return next(err);
      }
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        next(null, b['keys'][0]['value'], b['keys'][1]['value']);
      } else {
        var e = new Error(body);
        e.statusCode = response.statusCode;
        next(e);
      }
    }
  );
};

