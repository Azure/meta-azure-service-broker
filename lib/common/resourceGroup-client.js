/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var azureMgtResourceGroup = require('azure-arm-resource');
var common = require('./index');

var resourceGroup;

exports.instantiate = function(azure) {

    var environment = common.getEnvironment(azure.environment);
    var options = {
        environment: environment
    };

    var appTokenCreds = new msRestAzure.ApplicationTokenCredentials(azure.client_id, azure.tenant_id, azure.client_secret, options);

    var rc = new azureMgtResourceGroup.ResourceManagementClient(appTokenCreds, azure.subscription_id, environment.resourceManagerEndpointUrl);
    resourceGroup = rc.resourceGroups;    

};

exports.createOrUpdate = function(resourceGroupName, groupParameters, next) {
    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function (err, result, request, response) {
        next(err, result);
    });
};

exports.checkExistence = function(resourceGroupName, next) {
    resourceGroup.checkExistence(resourceGroupName, function (err, result, request, response) {
        next(err, result);
    });
};
