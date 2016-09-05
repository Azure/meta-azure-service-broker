var logule = require('logule');
var statusCode = require('./statusCode');

module.exports = function() {
  var clientName = 'azuresqldbClient';
  var log = logule.init(module, clientName);

  this.validateCredential = function(credential, next) {
    var Connection = require('tedious').Connection;
    var config = {  
      userName: credential.administratorLogin,
      password: credential.administratorLoginPassword,
      server: credential.sqlServerName + '.database.windows.net',
      options: {encrypt: true, database: credential.sqldbName}
    };
    var connection = new Connection(config);
    log.debug('Connecting to SQL server %s.database.windows.net and database %s', credential.sqlServerName, credential.sqldbName);
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
