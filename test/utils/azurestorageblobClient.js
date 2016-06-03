var azure = require('azure-storage');
var async = require('async');
var logule = require('logule');
var statusCode = require('./statusCode');

var LOCALFILE = __filename;

module.exports = function() {
  var clientName = 'azurestorageblobClient';
  var log = logule.init(module, clientName);
  var validate = function(accountName, accountKey, containerName, callback) {
    var context = {}
    context.accountName = accountName;
    context.accountKey = accountKey;
    context.containerName = containerName;
    context.status = statusCode.FAIL;
    var destblob = clientName + Math.floor(Math.random()*1000);
    try {
      var blobService = azure.createBlobService(accountName, accountKey);
      log.debug('Uploading blob: '+ destblob);
      blobService.createBlockBlobFromLocalFile(containerName, destblob, LOCALFILE, function(error, result, response) {
        if (!error) {
          if(response.isSuccessful == true) {
              context.status = statusCode.PASS
          } 
          log.debug('Deleteing blob: '+ destblob);
          blobService.deleteBlob(containerName, destblob, function(error, response) {
            if(error) {log.error("Failed to clean test blob: " + destblob);}
          });
          callback(context);
        } else {
            log.error('Fail to create blob. Error: ' + error);
            callback(context)
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
        validate(credential.storage_account_name, credential.primary_access_key, credential.container_name, function(context) {
           callback(null, context);
        });
      },
      function(callback) {
        validate(credential.storage_account_name, credential.secondary_access_key, credential.container_name, function(context) {
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

