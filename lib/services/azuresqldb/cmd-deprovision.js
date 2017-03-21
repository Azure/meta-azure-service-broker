/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
<<<<<<< HEAD
var common = require('../../common');
var log = common.getLogger(Config.name);
=======
var log = require('winston').loggers.get(Config.name);
>>>>>>> 2d516c4aea40dfb009515bcaa5447c21ad0c0320

var sqldbDeprovision = function (params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
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
