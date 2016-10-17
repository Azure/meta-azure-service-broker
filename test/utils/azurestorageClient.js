var azure = require('azure-storage');
var async = require('async');
var logule = require('logule');
var statusCode = require('./statusCode');

var LOCALFILE = __filename;

module.exports = function() {
  var clientName = 'azurestorageClient';
  var log = logule.init(module, clientName);
  var validate = function(accountName, accountKey, callback) {
    var context = {}
    context.accountName = accountName;
    context.accountKey = accountKey;
    context.status = statusCode.FAIL;
    var destcontainer = 'container' + Math.floor(Math.random()*1000);
    try {
      var blobService = azure.createBlobService(accountName, accountKey);
      log.debug('creating container: '+ destcontainer);
      blobService.createContainerIfNotExists(destcontainer, function(error, result, response){
        if(!error){
          context.status = statusCode.PASS;
          callback(context);
        } else {
          log.error('Fail to create container. Error: ' + error);
          callback(context);
        }
      });
    } catch (ex) {
      context.exception = ex;
      callback(context);
    }
  }

  this.validateCredential = function(credential, next) {
    async.parallel([
      function(callback) {
        validate(credential.storage_account_name, credential.primary_access_key, function(context) {
           callback(null, context);
        });
      },
      function(callback) {
        validate(credential.storage_account_name, credential.secondary_access_key, function(context) {
           callback(null, context);
        });
      }
    ],
    function(error, results) {
      var result = statusCode.PASS;
      for(var i=0, len=results.length; i < len; i++) {
        if(results[i].status != statusCode.PASS) {
          result = statusCode.FAIL;
          log.error('FAIL result: ' + results[i])
        }
      }
      next(result);
    });
  };
}


