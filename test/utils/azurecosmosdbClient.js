var common = require('../../lib/common');
var statusCode = require('./statusCode');
var _ = require('underscore');

module.exports = function() {
  var clientName = 'azurecosmosdbClient';
  common.getLogger(clientName, clientName);
  var log = require('winston').loggers.get(clientName);
  
  this.validateCredential = function(credential, next) {
    log.debug(credential);
    if (_.has(credential, 'cosmosdb_connection_string')) {
      log.info('Use MongoDB client to test');
      var mongoClient = require('mongodb').MongoClient;
      mongoClient.connect(credential['cosmosdb_connection_string'], function (error, db) {
        if (error) {
          log.error(error);
          return next(statusCode.FAIL);
        }
        
        log.info('Host can be connected.');
        
        try {
          var testdb = db.db('integration_test_db');
          log.info('DB can be created.');
          
          var testcol = testdb.collection('integration_test_collection');
          log.info('Collection can be created.');
          
          testcol.insertOne({a:1}, {w:1}, function(err) {
            db.close();
            
            if (err) {
              log.error(err);
              return next(statusCode.FAIL);
            }
            
            log.info('Document can be inserted.');
            next(statusCode.PASS);
          });
        } catch (ex) {
          log.error(ex);
          next(statusCode.FAIL);
        }
      });
    } else {
      var compareVersion = require('compare-version');
      if (compareVersion('5.4.0', process.version.slice(1)) >= 0) {
        // https://github.com/Azure/azure-documentdb-node/issues/102
        log.warn('Node version < 5.4.0 can trigger a known issue. Skip this test case.');
        return next(statusCode.PASS);
      }
      
      log.info('Use DocDB client to test');
      var collectionName = 'docdbcol' + Math.floor(Math.random()*1000);
      var collectionDefinition = { id: collectionName };
      
      var documentdb = require('documentdb');
      var documentdbclient = new documentdb.DocumentClient(credential['cosmosdb_host_endpoint'], {masterKey: credential['cosmosdb_master_key']});
      documentdbclient.createCollection(credential['cosmosdb_database_link'], collectionDefinition, function(error) {
        if (error) {
          next(statusCode.FAIL);
        } else {
          next(statusCode.PASS);  
        }
      });
    }
  };
};
