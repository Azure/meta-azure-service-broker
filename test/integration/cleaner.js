var common = require('../../lib/common');
var msRestRequest = require('../../lib/common/msRestRequest');
var chai = require('chai');
var should = chai.should();
var util = require('util');

exports.clean = function(provisioningParameters, done) {
  var environmentName = process.env['ENVIRONMENT'];
  var subscriptionId = process.env['SUBSCRIPTION_ID'];
  var resourceGroupName = provisioningParameters.resourceGroup;
  
  var API_VERSIONS = common.API_VERSION[environmentName];
  
  var environment = common.getEnvironment(environmentName);
  var resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
  
  resourceGroupUrl = util.format('%s/subscriptions/%s/resourcegroups/%s',
    resourceManagerEndpointUrl, subscriptionId, resourceGroupName);
  
  var headers = common.mergeCommonHeaders(console, 'Delete resource group for integration test', {});
  msRestRequest.DELETE(resourceGroupUrl, headers, API_VERSIONS.RESOURCE_GROUP, function (err, res, body) {
    should.not.exist(err);
    res.statusCode.should.equal(202);
    done();
  });
};