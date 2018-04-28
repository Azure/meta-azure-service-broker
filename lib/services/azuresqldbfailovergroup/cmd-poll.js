/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbfgPoll = function (params) {

  var reqParams = params.parameters || {};
  var provisioningResult = params.provisioning_result || {};
  var lastoperation = params.last_operation || '';
  var primaryResourceGroupName = provisioningResult.primaryResourceGroupName || '';
  var primaryServerName = reqParams.primaryServerName || '';
  var primaryDbName = reqParams.primaryDbName || '';
  var secondaryResourceGroupName = provisioningResult.secondaryResourceGroupName || '';
  var secondaryServerName = reqParams.secondaryServerName || '';
  var failoverGroupName = reqParams.failoverGroupName || '';

  log.info(util.format('cmd-poll: primaryResourceGroupName: %s, primaryServerName: %s, primaryDbName: %s', primaryResourceGroupName, primaryServerName, primaryDbName));

  this.poll = function (sqldbfgOperations, next) {
    var reply = {
      state: '',
      description: ''
    };

    var pollingResult = {};
    pollingResult.body = provisioningResult;
    pollingResult.value = reply;

    if (params.plan_id === '5a75ffc1-555d-4193-b60b-eb464069f913') { // registered failover group doesn't need to poll
      reply.state = 'succeeded';
      reply.description = util.format('Registered failover group %s.', failoverGroupName);
      return next(null, pollingResult);
    }
    
    function deleteSecondaryDb() {
      sqldbfgOperations.deleteSecondaryDb(function(err){
        if (err) {
          return next(err);
        }

        delete provisioningResult.fgPollingUrl;
        reply.state = 'succeeded';
        reply.description = util.format('Deleted failover group %s. Deleted the secondary database %s.', failoverGroupName, primaryDbName);
        next(null, pollingResult);
      });
    }

    sqldbfgOperations.setParameters(
      primaryResourceGroupName,
      primaryServerName,
      primaryDbName,
      secondaryResourceGroupName,
      secondaryServerName,
      failoverGroupName);

    if (lastoperation === 'provision') {
      sqldbfgOperations.checkComplete(provisioningResult.fgPollingUrl, function(err, status){
        if (err) {
          return next(err);
        }

        log.info('cmd-poll: create failover group status: %s', status);
        if (status === 'Succeeded') {
          delete provisioningResult.fgPollingUrl;
          reply.state = 'succeeded';
          reply.description = util.format('Created failover group %s.', failoverGroupName);
          next(null, pollingResult);
        } else {
          reply.state = 'in progress';
          reply.description = util.format('Creating failover group %s.', failoverGroupName);
          next(null, pollingResult);
        }
      });
    } else if (lastoperation === 'deprovision') {
      if (provisioningResult.fgPollingUrl) {
        sqldbfgOperations.checkComplete(provisioningResult.fgPollingUrl, function(err, status){
          if (err) {
            return next(err);
          }

          log.info('cmd-poll: delete failover group status: %s', status);
          if (status === 'Succeeded') {
            deleteSecondaryDb();
          } else {
            reply.state = 'in progress';
            reply.description = util.format('Deleting failover group %s.', failoverGroupName);
            next(null, pollingResult);
          }
        });
      } else {
        deleteSecondaryDb();
      }
    } else {
      var errorMessage = util.format('Unexpected lastoperation to poll: %s', lastoperation);
      next(Error(errorMessage));
    }
  };

};

module.exports = sqldbfgPoll;
