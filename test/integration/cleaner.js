/*jshint camelcase: false */
var common = require('../../lib/common');
var msRestRequest = require('../../lib/common/msRestRequest');
var chai = require('chai');
var should = chai.should();
var util = require('util');

exports.clean = function(provisioningParameters, done) {
  var resourceGroupName = provisioningParameters.resourceGroup || provisioningParameters.resource_group_name;
  if (!resourceGroupName) {
    return done();
  }
  
  var environmentName = process.env['ENVIRONMENT'];
  var subscriptionId = process.env['SUBSCRIPTION_ID'];
  
  var API_VERSIONS = common.API_VERSION[environmentName];
  
  var environment = common.getEnvironment(environmentName);
  var resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
  
  var resourceGroupUrl = util.format('%s/subscriptions/%s/resourcegroups/%s',
                                     resourceManagerEndpointUrl,
                                     subscriptionId,
                                     resourceGroupName);
  
  var headers = common.mergeCommonHeaders('Delete resource group for integration test', {});
  msRestRequest.DELETE(resourceGroupUrl, headers, API_VERSIONS.RESOURCE_GROUP, function (err, res, body) {
    should.not.exist(err);
    res.statusCode.should.equal(202);
    done();
  });
};