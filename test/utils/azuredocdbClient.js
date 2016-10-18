var async = require('async');
var logule = require('logule');
var documentdb = require('documentdb');
var statusCode = require('./statusCode');

module.exports = function() {
  var clientName = 'azuredocdbClient';
  var log = logule.init(module, clientName);
  this.validateCredential = function(credential, next) {
    log.debug(credential);
    try {
      var databaseName = 'docdb' + Math.floor(Math.random()*1000);
      var documentdbclient = new documentdb.DocumentClient(credential.documentdb_host, {masterKey: credential.documentdb_key});
      documentdbclient.createDatabase({id:databaseName}, function(error) {
        if (error) {
          next(statusCode.FAIL);
        } else {
          next(statusCode.PASS);  
        }
      });
    } catch (ex) {
      log.error('Got exception: ' + ex);
      next(statusCode.FAIL);
    }
  }
}

