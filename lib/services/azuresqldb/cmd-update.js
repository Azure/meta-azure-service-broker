/* jshint camelcase: false */

var _ = require('underscore');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var HttpStatus = require('http-status-codes');
var async = require('async');

var sqldbUpdate = function (params) {

    // Updates the the service instance to match desired parameters (params) and yields the resulting instance (updatedInstance)
    this.update = function (sqldbOps, next) {
        if (params.plan_id === '4b1cfc28-dda6-407b-abeb-7aa0b89f52bf') {
            var errorMessage = 'Registered database should not be updated.';
            return next(Error(errorMessage));
        }
        log.info('sqldb cmd-update.update invoked');
        var provisioningResult = params.instance['provisioning_result'];
        sqldbOps.setParameters(provisioningResult.resourceGroup, provisioningResult.sqlServerName, provisioningResult.name);

        // The updated instance will be stored in the broker database.
        var updatedInstance = _.extend({}, params.instance);
        updatedInstance['last_operation'] = 'update';

        // Update the old password stored in the broker DB when the server password is changed manually outside of Cloud Foundry
        if (params.requested.parameters && params.requested.parameters.sqlServerParameters && params.requested.parameters.sqlServerParameters.properties) {
            var newPassword = params.requested.parameters.sqlServerParameters.properties.administratorLoginPassword;
            updatedInstance.parameters.sqlServerParameters.properties.administratorLoginPassword = newPassword;
            updatedInstance['provisioning_result'].administratorLoginPassword = newPassword;

            // This only modifies the broker database so we can exit without the need to poll
            var reply = {
                statusCode: HttpStatus.OK, code: HttpStatus.getStatusText(HttpStatus.OK), value: {
                    state: 'succeeded',
                    description: 'Updated sqlserver password in broker database'
                } };
            return next(null, reply, updatedInstance);
        }

        var planId = params.requested['plan_id'];

        if (planId) {
            updatedInstance['plan_id'] = planId;

            // Example ID "/subscriptions/f5839dfd-61f0-4b2f-b06f-de7fc47b5998/resourceGroups/user-rg1/provider;s/Microsoft.Sql/servers/user-mysqlsvr/databases/mydb"
            updatedInstance.parameters.sqldbParameters.properties.sourceDatabaseId = provisioningResult.id;

            // Update the service plan
            // Get the preset azure parameters for the new plan

            Config.plans.forEach(function (item) {
                if (planId === item.id) {
                    log.info('SqlDb/cmd-provision/fixup parameters/plan name: %j', item.name);
                    updatedInstance.parameters.sqldbParameters.properties.maxSizeBytes = item.metadata.details.maxSizeBytes;
                    updatedInstance.parameters.sqldbParameters.properties.edition = item.metadata.details.edition;
                    updatedInstance.parameters.sqldbParameters.properties.requestedServiceObjectiveName = item.metadata.details.requestedServiceObjectiveName;
                }
            });
        }

        // Parameter format sent to CreateDatabase:
        // var updateRequest = {
        //     properties: {
        //         collation: "SQL_Latin1_General_CP1_CI_AS",
        //         maxSizeBytes: "2147483648",
        //         edition: "Basic",
        //         requestedServiceObjectiveName: "Basic",
        //         sourceDatabaseId: "/subscriptions/55839dff-61f0-4b2f-b06f-de7fc47b5998/resourceGroups/niroy-rg1/providers/Microsoft.Sql/servers/niroy-sqlsvr/databases/test-db"
        //     },
        //     tags: { "user-agent": "meta-azure-service-broker" },
        //     location: "West US"
        // }

        // Copy location since it is required for the request
        updatedInstance.parameters.location  = params.instance.parameters.location || params.instance['provisioning_result'].location;

        async.waterfall([
            function(callback){
                sqldbOps.createDatabase(updatedInstance.parameters, callback);
            }
        ], function(err, result){
            if (err) {
                log.error('sqldb cmd-update: create sql database: err: %j, result: %j', err, result);
                return next(err);
            } else {

                // Save result that is used for polling this async operation
                if (result.res.headers && result.res.headers['azure-asyncoperation']){
                    var asyncOperation = result.res.headers['azure-asyncoperation'];
                    updatedInstance.state.asyncOperation = asyncOperation;
                }

                log.info('sqldb cmd-update: create sql database success: result: %j', result);
                var reply = {
                    statusCode: HttpStatus.ACCEPTED,
                    code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
                    value: {
                        state: 'in progress',
                        description: 'Azure accepted sql database update request for ' + provisioningResult.name
                    }
                };
                return next(null, reply, updatedInstance);
            }
        });
    };
};

module.exports = sqldbUpdate;
