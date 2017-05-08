/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var postgresqldbDeprovision = function (params) {

    var provisioningResult = params.provisioning_result;
    var resourceGroupName = provisioningResult.resourceGroup;
    var postgresqlServerName = provisioningResult.postgresqlServerName;

    log.info(util.format('postgresqldb cmd-deprovision: resourceGroupName: %s, postgresqlServerName: %s', resourceGroupName, postgresqlServerName));

    this.deprovision = function (postgresqldbOperations, next) {

        postgresqldbOperations.setParameters(resourceGroupName, postgresqlServerName);

        postgresqldbOperations.deleteServer(function (err, serverPollingUrl) {
            if (err) {
                log.error('cmd-deprovision: deleteServer: err: %j', err);
                return next(err);
            } else {
                var result = {};
                result.value = {};
                result.value.state = 'in progress';
                result.value.description = 'Deleting Server';
                if (serverPollingUrl) {
                    provisioningResult.serverPollingUrl = serverPollingUrl;
                }
                result.body = provisioningResult;
                next(null, result);
            }
        });
    };
};

module.exports = postgresqldbDeprovision;
