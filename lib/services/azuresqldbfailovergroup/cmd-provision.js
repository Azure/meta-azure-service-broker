/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var util = require('util');

var sqldbfgProvision = function (params) {

  var reqParams = params.parameters || {};
  var accountPool = params.accountPool.sqldb || {};

  var primaryServerName = reqParams.primaryServerName || '';
  var primaryDbName = reqParams.primaryDbName || '';
  var secondaryServerName = reqParams.secondaryServerName || '';
  var failoverGroupName = reqParams.failoverGroupName || '';
  var userRoles = reqParams.userRoles || [];
  var userPermissions = reqParams.userPermissions || [];

  this.provision = function (sqldbfgOperations, next) {
    var primaryFQDN, secondaryFQDN;

    function handleResourceError(resourceName, result, callback) {
      if (result.statusCode === HttpStatus.NOT_FOUND) {
        var errorMessage = util.format('The %s does not exist.', resourceName);
        callback(Error(errorMessage));
      } else {
        var errorMessage = util.format('Unexpected error: %j', result);
        callback(Error(errorMessage));
      }
    }

    var primaryResourceGroupName = accountPool[primaryServerName]['resourceGroup'];
    var secondaryResourceGroupName = accountPool[secondaryServerName]['resourceGroup'];
    sqldbfgOperations.setParameters(
      primaryResourceGroupName,
      primaryServerName,
      primaryDbName,
      secondaryResourceGroupName,
      secondaryServerName,
      failoverGroupName);

    async.waterfall([
      function (callback) {
        sqldbfgOperations.getPrimaryServer(function (err, result) {
          if (err) {
            log.error('cmd-provision: get the primiary server: err: %j', err);
            return callback(err);
          }
          log.debug('cmd-provision: get the primiary server: %j', result);
          if (result.statusCode === HttpStatus.OK) {
            primaryFQDN = result.body.properties.fullyQualifiedDomainName;
            callback(null);
          } else {
            handleResourceError('primary server', result, callback);
          }
        });
      },
      function (callback) {
        sqldbfgOperations.getPrimaryDb(function (err, result) {
          if (err) {
            log.error('cmd-provision: get the primiary db: err: %j', err);
            return callback(err);
          }
          log.debug('cmd-provision: get the primiary db: %j', result);
          if (result.statusCode === HttpStatus.OK) {
            callback(null);
          } else {
            handleResourceError('primary db', result, callback);
          }
        });
      },
      function (callback) {
        sqldbfgOperations.getSecondaryServer(function (err, result) {
          if (err) {
            log.error('cmd-provision: get the secondary server: err: %j', err);
            return callback(err);
          }
          log.debug('cmd-provision: get the secondary server: %j', result);
          if (result.statusCode === HttpStatus.OK) {
            secondaryFQDN = result.body.properties.fullyQualifiedDomainName;
            callback(null);
          } else {
            handleResourceError('secondary server', result, callback);
          }
        });
      },
      function (callback) {
        sqldbfgOperations.getFailoverGroup(function (err, result) {
          if (err) {
            log.error('cmd-provision: get the failover group: err: %j', err);
            return callback(err);
          }
          log.debug('cmd-provision: get the failover group: %j', result);
          if (result.statusCode === HttpStatus.NOT_FOUND || result.statusCode === HttpStatus.OK) {
            callback(null, result);
          } else {
            handleResourceError('failover group', result, callback);
          }
        });
      },
      function (failoverGroupResult, callback) {
        if (params.plan_id === '5a75ffc1-555d-4193-b60b-eb464069f913') { // register an existing failover group
          if (failoverGroupResult.statusCode !== HttpStatus.OK) {
            var errorMessage = util.format('The failover group %s doesn\'t exist.', failoverGroupName);
            return callback(Error(errorMessage));
          }
          if (!sqldbfgOperations.validateFailoverGroup(failoverGroupResult.body.properties.partnerServers, failoverGroupResult.body.properties.databases)) {
            var errorMessage = util.format('Specified failover group validation failed.');
            return callback(Error(errorMessage));
          }

          var result = {};
          result.body = {};
          result.body.primaryResourceGroupName = primaryResourceGroupName;
          result.body.primaryFQDN = primaryFQDN;
          result.body.secondaryResourceGroupName = secondaryResourceGroupName;
          result.body.secondaryFQDN = secondaryFQDN;

          result.value = {};
          result.value.state = 'succeeded';
          result.value.description = util.format('Registered failover group %s.', failoverGroupName);
          callback(null, result);
        } else { // create a new failover group
          if (failoverGroupResult.statusCode === HttpStatus.OK) {
            var errorMessage = util.format('The failover group %s already exists.', failoverGroupName);
            return callback(Error(errorMessage));
          }

          sqldbfgOperations.createFailoverGroup(function (err, fgPollingUrl) {
            if (err) {
              log.error('sqldb cmd-provision: create failover group: err: %j', err);
              return callback(err);
            }
            var result = {};
            result.body = {};
            result.body.primaryResourceGroupName = primaryResourceGroupName;
            result.body.primaryFQDN = primaryFQDN;
            result.body.secondaryResourceGroupName = secondaryResourceGroupName;
            result.body.secondaryFQDN = secondaryFQDN;
            result.body.fgPollingUrl = fgPollingUrl;

            result.value = {};
            result.value.state = 'in progress';
            result.value.description = util.format('Creating failover group %s.', failoverGroupName);
            callback(null, result);
          });
        }
      }
    ], function (err, result) {
      if (err) {
        log.error('cmd-provision: final callback: err: ', err);
      } else {
        log.info('cmd-provision: final callback: result: %j', result.value);
      }
      next(err, result);
    });
  };

  // validators
  function isValidStringArray(a) {
    // SQL injection detect
    var regex = /^([ a-zA-Z0-9_-]+)$/;
    if (!_.isArray(a)) {
      return false;
    } else {
      var valid = true;
      a.forEach(function(v){
        if (!_.isString(v) || !regex.test(v)) valid = false;
      });
      return valid;
    }
  }

  this.areUserRolesValid = function () {
    return isValidStringArray(userRoles);
  };

  this.areUserPermissionsValid = function () {
    return isValidStringArray(userPermissions);
  };

  this.parametersNotProvided = function () {
    var ret = [];
    var names = ['primaryServerName', 'primaryDbName', 'secondaryServerName', 'failoverGroupName'];
    var values = [primaryServerName, primaryDbName, secondaryServerName, failoverGroupName];
    for (var i = 0; i < names.length; i++) {
      if (!_.isString(values[i]) || values[i].length === 0) {
        ret.push(names[i]);
      }
    }
    return ret;
  };

  this.primaryServerCredentialsProvided = function () {
    return (primaryServerName in accountPool);
  };

  this.secondaryServerCredentialsProvided = function () {
    return (secondaryServerName in accountPool);
  };

  this.getInvalidParams = function () {
    var invalidParams = [];
    invalidParams = invalidParams.concat(this.parametersNotProvided());
    if (!this.areUserRolesValid()) invalidParams.push('userRoles');
    if (!this.areUserPermissionsValid()) invalidParams.push('UserPermissions');
    if ((invalidParams.indexOf('primaryServerName') == -1) && (!this.primaryServerCredentialsProvided())) invalidParams.push('primaryServerName');
    if ((invalidParams.indexOf('secondaryServerName') == -1) && (!this.secondaryServerCredentialsProvided())) invalidParams.push('secondaryServerName');
    return invalidParams;
  };
};

module.exports = sqldbfgProvision;
