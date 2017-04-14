/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbDeprovision = function (params) {

    var provisioningResult = params.provisioning_result;
    var resourceGroupName = provisioningResult.resourceGroup;
    var sqldbName = provisioningResult.name;    
    var sqlServerName = provisioningResult.sqlServerName;

    log.info(util.format('sqldb cmd-deprovision: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.deprovision = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);

        sqldbOperations.deleteDatabase(function (err) {
            if (err) {
                log.error('sqldb cmd-deprovision: async.waterfall/deleteDatabase: err: %j', err);
                return next(err);
            } else {
                var result = {};
                result.state = 'succeeded';
                result.description = 'Deleted database';
                next(null, result);
            }
        });
    };
};

module.exports = sqldbDeprovision;
