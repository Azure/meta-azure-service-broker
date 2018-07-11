/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbfgBind = function (params) {

  var reqParams = params.parameters || {};
  var accountPool = params.accountPool.sqldb || {};

  var provisioningResult = params.provisioning_result || {};
  var primaryResourceGroupName = provisioningResult.primaryResourceGroupName || '';
  var primaryServerName = reqParams.primaryServerName || '';
  var primaryDbName = reqParams.primaryDbName || '';
  var secondaryResourceGroupName = provisioningResult.secondaryResourceGroupName || '';
  var secondaryServerName = reqParams.secondaryServerName || '';
  var failoverGroupName = reqParams.failoverGroupName || '';
  var userRoles = reqParams.userRoles || [];
  var userPermissions = reqParams.userPermissions || [];

  log.info(util.format('cmd-bind: primaryResourceGroupName: %s, primaryServerName: %s, primaryDbName: %s', primaryResourceGroupName, primaryServerName, primaryDbName));

  this.bind = function (sqldbfgOperations, next) {
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

    var databaseUser = common.generateName();
    var databaseUserPassword = common.generateStrongPassword();

    async.waterfall([
      function (callback) {
        // create the login
        sqldbfgOperations.createDatabaseUser(
          provisioningResult.primaryFQDN,
          primaryAdministratorLogin,
          primaryAdministratorLoginPassword,
          databaseUser,
          databaseUserPassword,
          function(err) {
            if (err) {
              log.error('cmd-bind: async.waterfall/createPrimaryDatabaseUser: err: %j', err);
            }
            callback(err);
          }
        );
      },
      function (callback) {
        sqldbfgOperations.alterRolesToUser(
          provisioningResult.primaryFQDN,
          primaryAdministratorLogin,
          primaryAdministratorLoginPassword,
          databaseUser,
          userRoles,
          function(err) {
            if (err) {
              log.error('cmd-bind: async.waterfall/alterRolesToUser: err: %j', err);
            }
            callback(err);
          }
        );
      },
      function (callback) {
        sqldbfgOperations.grantPermissionsToUser(
          provisioningResult.primaryFQDN,
          primaryAdministratorLogin,
          primaryAdministratorLoginPassword,
          databaseUser,
          userPermissions,
          function(err) {
            if (err) {
              log.error('cmd-bind: async.waterfall/grantPermissionsToUser: err: %j', err);
            }
            callback(err);
          }
        );
      }
    ], function (err) {
      next(err, {databaseUser: databaseUser, databaseUserPassword: databaseUserPassword});
    });
  };
};

module.exports = sqldbfgBind;
