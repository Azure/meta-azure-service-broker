/* jshint camelcase: false */
/* jshint newcap: false */

var msRestAzure = require('ms-rest-azure');
var azureMgtResourceGroup = require('azure-arm-resource');
var common = require('./index');

var resourceGroup;

var log;

exports.instantiate = function(azure, logger) {
    
    log = logger;
    
    var environment = common.getEnvironment(azure.environment);
    var options = {
        environment: environment
    };

    var appTokenCreds = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);

    var rc = new azureMgtResourceGroup.ResourceManagementClient(appTokenCreds, azure.subscriptionId, environment.resourceManagerEndpointUrl);
    resourceGroup = rc.resourceGroups;    

};

exports.createOrUpdate = function(resourceGroupName, groupParameters, next) {
    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function (err, result, request, response) {
        common.logHttpResponse(log, response, 'Create or update resource group', true);
        next(err, result);
    });
};

exports.checkExistence = function(resourceGroupName, next) {
    resourceGroup.checkExistence(resourceGroupName, function (err, result, request, response) {
        common.logHttpResponse(log, response, 'Check resource group existence', true);
        next(err, result);
    });
};
