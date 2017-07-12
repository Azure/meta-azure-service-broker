var common = require('../../lib/common');
var documentdb = require('documentdb');
var statusCode = require('./statusCode');

module.exports = function() {
  var clientName = 'azuredocdbClient';
  var log = common.getLogger(clientName);
  
  this.validateCredential = function(credential, next) {
    log.debug(credential);
    
    var compareVersion = require('compare-version');
    if (compareVersion('5.4.0', process.version.slice(1)) >= 0) {
      // https://github.com/Azure/azure-documentdb-node/issues/102
      log.warn('Node version < 5.4.0 can trigger a known issue. Skip this test case.');
      return next(statusCode.PASS);
    }
    
    try {
      var collectionName = 'docdbcol' + Math.floor(Math.random()*1000);
      var collectionDefinition = { id: collectionName };
      var documentdbclient = new documentdb.DocumentClient(credential['documentdb_host_endpoint'], {masterKey: credential['documentdb_master_key']});
      documentdbclient.createCollection(credential['documentdb_database_link'], collectionDefinition, function(error) {
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
  };
};
