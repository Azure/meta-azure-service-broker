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
        if (params.plan_id === '4b1cfc28-dda6-407b-abeb-7aa0b89f52bf') {
            var result = {};
            result.state = 'succeeded';
            result.description = 'Unregistered the database';
            next(null, result);
        } else {
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
        }
    };
};

module.exports = sqldbDeprovision;
