/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var mysqldbDeprovision = function (params) {

    var provisioningResult = params.provisioning_result;
    var resourceGroupName = provisioningResult.resourceGroup;
    var mysqlServerName = provisioningResult.mysqlServerName;

    log.info(util.format('mysqldb cmd-deprovision: resourceGroupName: %s, mysqlServerName: %s', resourceGroupName, mysqlServerName));

    this.deprovision = function (mysqldbOperations, next) {

        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName);

        mysqldbOperations.deleteServer(function (err, serverPollingUrl) {
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

module.exports = mysqldbDeprovision;
