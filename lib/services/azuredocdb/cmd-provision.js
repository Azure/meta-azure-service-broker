/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var common = require('../../common');
var HttpStatus = require('http-status-codes');

var docDbProvision = function(log, params) {

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
        docDb.checkDocDbAccountExistence(resourceGroupName, docDbAccountName, function(err, result) {
          if (err) {
            return callback(err);
          }
          if (result) {
            var error = new Error('The docDb account name is not available.');
            error.statusCode = HttpStatus.CONFLICT;
            return callback(error);
          }
          callback(null);
        });
      },
      function(callback) {
        var params = {
          'location': location,
          'properties': {
            'Name': docDbAccountName,
            'databaseAccountOfferType': 'Standard'
          },
          'tags': common.mergeTags(reqParams.tags)
        };
        
        docDb.createDocDbAccount(resourceGroupName, docDbAccountName, params,
          function(err) {
            if (err) {
              return callback(err);
            }
            var result = {
              resourceGroupName: resourceGroupName,
              docDbAccountName: docDbAccountName
            };
            callback(null, result);
          }
        );
      }
    ], function(err, result){
      if (err) {
        next(err);
      } else {
        next(null, result);
      }
    });        
  };
  
  this.verifyParameters = function() {
    var reqParamsKey = ['resourceGroup', 'docDbAccountName', 'docDbName', 'location'];
    return common.verifyParameters(reqParams, reqParamsKey);
  };

};

module.exports = docDbProvision;

