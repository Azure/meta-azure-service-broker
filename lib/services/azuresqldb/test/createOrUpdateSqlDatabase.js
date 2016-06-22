var params = require('./params');
var async = require('async');
var util = require('util');
var azureSqlRestOps = require('../azureSqlRestOps');
var azureTokenRestOps = require('../azureTokenRestOps');

var sqlOps = new azureSqlRestOps(null, params);
var tokenOps = new azureTokenRestOps(null, params);

async.waterfall([
    function(callback) {
        tokenOps.getToken(function(err, accessToken) {
          if (err) {
              return callback(err);
          } else {
              callback (null, accessToken);
          }
        });
    }, 
    function(accessToken, callback){
        var token = accessToken;
        var serverName = "guwe-dbserver";
        var databaseName = "guwe2";
        sqlOps.createOrUpdateSqlDatabase(token, serverName, databaseName, function(err, response, body) {
            console.log(response.statusCode);
            if(err) {
                console.log(err);
                return callback(err);
            } else {
                callback(null, body);
            }
        });
    }
], function(err, result) {
    if(err) {
        console.log(err);
    } else {
        console.log(result);
    }
});