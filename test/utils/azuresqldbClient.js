var logule = require('logule');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');

module.exports = function(environment) {
  var clientName = 'azuresqldbClient';
  var log = logule.init(module, clientName);

  this.validateCredential = function(credential, next) {
    var Connection = require('tedious').Connection;
    var serverSuffix = supportedEnvironments[environment]['sqlServerEndpointSuffix'];
    var config = {  
      userName: credential.databaseLogin,
      password: credential.databaseLoginPassword,
      server: credential.sqlServerName + serverSuffix,
      options: {encrypt: true, database: credential.sqldbName}
    };
    var connection = new Connection(config);
    log.debug('Connecting to SQL server %s%s and database %s', credential.sqlServerName, serverSuffix, credential.sqldbName);
    connection.on('connect', function(err) {
      if(!err){
        log.debug('The SQL Database can be connected.');
        connection.close();
        next(statusCode.PASS)
      }
      else {
        log.error('The SQL Database can not be connected. Error: %j', error);
        connection.close();
        next(statusCode.FAIL);
      }
    }); 
  }
}
