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
      var collectionId = clientName + Math.floor(Math.random()*1000);
      var documentdbclient = new documentdb.DocumentClient(credential.documentdb_host, {masterKey: credential.documentdb_key});
      async.waterfall([
        function(callback) {
          var querySpec = {
            query: 'SELECT * FROM root r WHERE r.id= @id',
            parameters: [{
              name: '@id',
              value: credential.documentdb_database
            }]
          };
          documentdbclient.queryDatabases(querySpec).toArray(function(err, results) {
            if (err) {
              log.error('Failed to query database. Error: ' + err);
              callback(err);
            } else {
              if (results.length === 0) {
                log.error('Database NotFound: ' + credential.documentdb_database);
                callback(new Error('Database NotFound'), statusCode.FAIL);
              } else {
                log.debug('Found database: ' + results[0]);
                callback(null, results[0])
              }
            }
          });
        },
        function(database, callback) {
          documentdbclient.createCollection(database._self, {id: collectionId}, {offerType: 'S1'}, function(err, created) {
            if (err) {
              log.error('Can not create collection. Error: ' + err);
            }
            callback(err, created);
          });
        },
        function(collection, callback) {
          var item = {"key1": "value1"}
          documentdbclient.createDocument(collection._self, item, function(err, doc) {
            if (err) {
              log.error('Can not create document. Error: ' + err);
              callback(err);
            } else {
              callback(null, statusCode.PASS);
            }
          });
        }
      ],
      function(err, result) {
        if (err || result != statusCode.PASS) {
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
