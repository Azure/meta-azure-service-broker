/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbfgDeprovision = function (params) {

  var reqParams = params.parameters || {};
  var provisioningResult = params.provisioning_result || {};
  var primaryResourceGroupName = provisioningResult.primaryResourceGroupName || '';
  var primaryServerName = reqParams.primaryServerName || '';
  var primaryDbName = reqParams.primaryDbName || '';
  var secondaryResourceGroupName = provisioningResult.secondaryResourceGroupName || '';
  var secondaryServerName = reqParams.secondaryServerName || '';
  var failoverGroupName = reqParams.failoverGroupName || '';

  log.info(util.format('cmd-deprovision: primaryResourceGroupName: %s, primaryServerName: %s, primaryDbName: %s', primaryResourceGroupName, primaryServerName, primaryDbName));

  this.deprovision = function (sqldbfgOperations, next) {
    if (params.plan_id === '5a75ffc1-555d-4193-b60b-eb464069f913') { // registered failover group doesn't delete any resources on Azure
      var result = {};
      result.value = {};
      result.value.state = 'succeeded';
      result.value.description = util.format('Unregistered failover group %s.', failoverGroupName);
      result.body = provisioningResult;
      return next(null, result);
    }

    sqldbfgOperations.setParameters(
      primaryResourceGroupName,
      primaryServerName,
      primaryDbName,
      secondaryResourceGroupName,
      secondaryServerName,
      failoverGroupName);

    sqldbfgOperations.deleteFailoverGroup(function (err, fgPollingUrl) {
      if (err) {
        log.error('cmd-deprovision: deleteFailoverGroup: err: %j', err);
        return next(err);
      }

      if (!fgPollingUrl) {
        var result = {};
        result.value = {};
        result.value.state = 'succeeded';
        result.value.description = util.format('Failover group %s doesn\'t exist.', failoverGroupName);
        result.body = provisioningResult;
        return next(null, result);
      }

      var result = {};
      result.value = {};
      result.value.state = 'in progress';
      result.value.description = util.format('Deleting failover group %s.', failoverGroupName);
      provisioningResult.fgPollingUrl = fgPollingUrl;
      result.body = provisioningResult;
      next(null, result);
    });
  };
};

module.exports = sqldbfgDeprovision;
