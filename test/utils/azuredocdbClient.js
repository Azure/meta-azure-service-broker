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
      var collectionName = 'docdbcol' + Math.floor(Math.random()*1000);
      var collectionDefinition = { id: collectionName };
      var documentdbclient = new documentdb.DocumentClient(credential.documentdb_host_endpoint, {masterKey: credential.documentdb_master_key});
      documentdbclient.createCollection(credential.documentdb_database_link, collectionDefinition, function(error) {
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

