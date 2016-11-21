/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var async = require('async');

var docDbPoll = function(log, params) {
  
  var instanceId = params.instance_id;
  var provisioningResult = JSON.parse(params.provisioning_result);
  var lastoperation = params.last_operation || '';

  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var docDbAccountName = provisioningResult.docDbAccountName || '';
  
  var reqParams = params.parameters || {};
  var docDbName = reqParams.docDbName || '';

  function sendReply(reply, callback){
    reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: reply,
    };
    callback(null, reply, provisioningResult);
  }
  
  this.poll = function(docDb, callback) {
    var reply = {
      state: '',
      description: '',
    };
    
    docDb.getDocDbAccount(resourceGroupName, docDbAccountName, function(err, account) {
        
      if (lastoperation === 'provision') {
        if (err) {
          return callback(err);
        }
        var accountState = account.properties.provisioningState;
        log.info('Getting the provisioning state of the docDb account %s: %j', docDbAccountName, accountState);
      
        if (accountState == 'Succeeded') {
          var documentEndpoint = account.properties.documentEndpoint;
          
          async.waterfall([
            function(callback) {
              docDb.getToken(function(err, accessToken) {
                callback(err, accessToken);
              });
            },
            function(accessToken, callback) {
              docDb.getAccountKey(resourceGroupName, docDbAccountName, accessToken, function(err, masterKey) {
                callback(err, masterKey);
              });
            },
            function(masterKey, callback) {
              docDb.createDocDbDatabase(documentEndpoint, masterKey, docDbName, function(err, database) {
                /*
                  See the sample of "database" here: https://msdn.microsoft.com/en-us/library/azure/mt489072.aspx
                  The broker uses following properties in "database":                
                  {
                    "id": "volcanodb2", // The same to database name
                    "_self": "dbs\/CqNBAA==\/" // Database link, which used for creating collections, documents...
                  }
                */
                callback(err, database);
              });
            }
          ], function(err, database) {
            if (err) {
              callback(err);
            } else {
              reply.state = 'succeeded';
              reply.description = 'Created the docDb';
              _.extend(provisioningResult, {documentEndpoint: documentEndpoint, database: database});
              sendReply(reply, callback);
            }
          });
        } else {
          reply.state = 'in progress';
          reply.description = 'Creating the docDb account, state: ' + accountState;
          sendReply(reply, callback);
        }
      
      } else {
        if (!err) {
          var accountState = account.properties.provisioningState;
          log.info('Getting the deprovisioning state of the docDb account %s: %j', docDbAccountName, accountState);
          
          reply.state = 'in progress';
          reply.description = 'Deleting the docDb account, state: ' + accountState;
        } else if (err.statusCode == HttpStatus.NOT_FOUND) {
          reply.state = 'succeeded';
          reply.description = 'Deleted the docDb account';
        } else {
          return callback(err);
        }
        sendReply(reply, callback);
      }
    });
  };
};

module.exports = docDbPoll;

