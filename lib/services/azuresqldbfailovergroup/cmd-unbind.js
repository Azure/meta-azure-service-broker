/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbUnbind = function (params) {

  var reqParams = params.parameters || {};
  var accountPool = params.accountPool.sqldb || {};
  var provisioningResult = params.provisioning_result || {};
  var bindingResult = params.binding_result || {};

  var primaryResourceGroupName = provisioningResult.primaryResourceGroupName || '';
  var primaryServerName = reqParams.primaryServerName || '';
  var primaryDbName = reqParams.primaryDbName || '';
  var secondaryResourceGroupName = provisioningResult.secondaryResourceGroupName || '';
  var secondaryServerName = reqParams.secondaryServerName || '';
  var failoverGroupName = reqParams.failoverGroupName || '';

  log.info(util.format('cmd-unbind: primaryResourceGroupName: %s, primaryServerName: %s, primaryDbName: %s', primaryResourceGroupName, primaryServerName, primaryDbName));

  this.unbind = function (sqldbfgOperations, next) {
    var primaryAdministratorLogin, primaryAdministratorLoginPassword;
    if (primaryServerName in accountPool) {
      primaryAdministratorLogin = accountPool[primaryServerName]['administratorLogin'];
      primaryAdministratorLoginPassword = accountPool[primaryServerName]['administratorLoginPassword'];
    } else {
      var errorMessage = util.format('Can\'t find the primary server %s in sqlServerPool.', primaryServerName);
      next(Error(errorMessage));
    }

    sqldbfgOperations.setParameters(
      primaryResourceGroupName,
      primaryServerName,
      primaryDbName,
      secondaryResourceGroupName,
      secondaryServerName,
      failoverGroupName);

    var databaseUser = bindingResult.databaseUser;

    log.info('sqldb cmd-unbind: dropDatabaseUser');
    sqldbfgOperations.dropDatabaseUser(
      provisioningResult.primaryFQDN,
      primaryAdministratorLogin,
      primaryAdministratorLoginPassword,
      databaseUser,
      function(err) {
        if (err) {
          log.error('cmd-unbind: dropDatabaseUser: err: %j', err);
        }
        next(err);
      }
    );

  };
};

module.exports = sqldbUnbind;
