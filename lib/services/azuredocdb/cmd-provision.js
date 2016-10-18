/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var common = require('../../common');

var docDbProvision = function(log, params) {

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = reqParams.resourceGroup || '';
  var docDbAccountName = reqParams.docDbAccountName || '';
  var location = reqParams.location || '';

  this.provision = function(docDb, resourceGroup, next) {
        
    var groupParameters = {
      location: location
    };

    async.waterfall([
      function(callback) {
        resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function(err, result) {
          if (err) {
            log.error('DocumentDb, resourceGroup.createOrUpdate, err: %j', err);
            callback(err);
          } else {
            callback(null);
          }
        });
      },
      function(callback) {
        log.debug('DocDb, docDb.provision, resourceGroupName: %j', resourceGroupName);
        log.debug('DocDb, docDb.provision, docDbAccountName: %j', docDbAccountName);
        docDb.provision(resourceGroupName, docDbAccountName, location, function(err, result) {
          log.debug('DocDb, docDb.provision, result: %j', result);
          if (err) {
            log.error('DocDb, docDb.provision, err: %j', err);
            callback(err);
          } else {
            var result = {
              resourceGroupName: resourceGroupName,
              docDbAccountName: docDbAccountName
            };
            callback(null, result);
          }
        });    
      }
    ], function(err, result){
      next(err, result);
    });        
  };

  //  Validators

  this.resourceGroupWasProvided = function() {
    if (_.isString(resourceGroupName)) {
      if (resourceGroupName.length !== 0) return true;
    }

    log.error('docDb Provision: Resource Group name was not provided.  Did you supply the parameters file?');
    return false;
  };
  
  this.docDbAccountNameWasProvided = function() {
    if (_.isString(docDbAccountName)) {
      if (docDbAccountName.length !== 0) return true;
    }

    log.error('docDb Provision: DocDb account name was not provided.  Did you supply the parameters file?');
    return false;
  };
  
  this.verifyParameters = function() {
    var reqParamsKey = ['resourceGroup', 'docDbAccountName', 'location'];
    return common.verifyParameters(reqParams, reqParamsKey);
  };

};

module.exports = docDbProvision;

