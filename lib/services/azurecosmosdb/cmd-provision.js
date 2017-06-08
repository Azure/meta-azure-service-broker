/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var common = require('../../common');
var HttpStatus = require('http-status-codes');
var _ = require('underscore');

var cosmosDbProvision = function(params) {

  var reqParams = params.parameters || {};

  var resourceGroupName = reqParams.resourceGroup || '';
  var cosmosDbAccountName = reqParams.cosmosDbAccountName || '';
  var location = reqParams.location || '';
  var accountKind = reqParams.kind;
  
  this.provision = function(cosmosDb, next) {

    async.waterfall([
      function(callback) {
        cosmosDb.getCosmosDbAccount(resourceGroupName, cosmosDbAccountName, function(err, res, body) {
          if (err) {
            return callback(err);
          }
          if (res.statusCode != HttpStatus.NOT_FOUND && res.statusCode != HttpStatus.NO_CONTENT) {
            var error = new Error('The cosmosDb account name is not available.');
            error.statusCode = HttpStatus.CONFLICT;
            return callback(error);
          }
          callback(null);
        });
      },
      function(callback) {
        cosmosDb.createResourceGroup(resourceGroupName, location, callback);
      },
      function(callback) {
        if (_.isUndefined(reqParams.tags)) {
          reqParams.tags = {};
        } 
        _.extend(reqParams.tags, {defaultExperience: accountKind});
        var params = {
          'location': location,
          'properties': {
            'databaseAccountOfferType': 'Standard'
          },
          'tags': common.mergeTags(reqParams.tags)
        };
        if (accountKind === 'MongoDB') {
          params['kind'] = 'MongoDB';
        } else {
          params['kind'] = 'GlobalDocumentDB';
        }
        
        cosmosDb.createCosmosDbAccount(resourceGroupName, cosmosDbAccountName, params, function(err) {
            if (err) {
              return callback(err);
            }
            var result = {
              resourceGroupName: resourceGroupName,
              cosmosDbAccountName: cosmosDbAccountName
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
    var reqParamsKey = ['resourceGroup', 'cosmosDbAccountName', 'cosmosDbName', 'location'];
    return common.verifyParameters(reqParams, reqParamsKey);
  };

};

module.exports = cosmosDbProvision;

