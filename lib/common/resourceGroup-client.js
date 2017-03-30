/* jshint camelcase: false */
/* jshint newcap: false */

var common = require('./index');
var msRestRequest = require('./msRestRequest');
var util = require('util');
var HttpStatus = require('http-status-codes');
var common = require('./index');
var log = common.getLogger(common.LOG_CONSTANTS.COMMON);

exports.createOrUpdate = function(prefix, azureProperties, resourceGroupName, groupParameters, callback) {
  
  var environmentName = azureProperties.environment;
  var environment = common.getEnvironment(environmentName);
  var API_VERSIONS = common.API_VERSION[environmentName];
  var resouceGroupUrl = util.format('%s/subscriptions/%s/resourceGroups/%s',
                                    environment.resourceManagerEndpointUrl,
                                    azureProperties.subscriptionId,
                                    resourceGroupName);
  
  msRestRequest.PUT(
    resouceGroupUrl,
    common.mergeCommonHeaders(util.format('%s - create or update resource group', prefix), {}),
    groupParameters,
    API_VERSIONS.RESOURCE_GROUP,
    function(err, response, body) {
      common.logHttpResponse(response, util.format('%s - create or update resource group', prefix), true);
      if(err) {
        log.error('%s - create or update resource group, err: %j', prefix, err);
        return callback(err);
      }
      if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.CREATED) {
        log.info('%s - create or update resource group, succeeded', prefix);
        callback(null);
      } else {
        log.error('%s - create or update resource group, err: %j', prefix, response.body);
        return common.formatErrorFromRes(response, callback);
      }
    }
  );
};
