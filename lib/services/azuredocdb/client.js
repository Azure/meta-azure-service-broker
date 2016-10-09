/* jshint camelcase: false */
/* jshint newcap: false */

var docDbClient = require('documentdb').DocumentClient;

var docDb;
var hostEndPoint = process.env['DOCDB_HOSTENDPOINT'];
var masterKey = process.env['DOCDB_MASTERKEY'];

var HttpStatus = require('http-status-codes');
var common = require('../../common/');

var log;

exports.instantiate = function(logger) {
  log = logger;
  docDb = new docDbClient(hostEndPoint, {masterKey:masterKey});
  // console.log('docDb-client instantiate: docDb object: %j', docDb);
};

exports.provision = function(databaseName, next) {
  docDb.queryDatabases({
    query: 'SELECT * FROM root r WHERE r.id = @id',
    parameters: [{name: '@id', value: databaseName}]
  }).toArray(function (err, results, responseHeaders) {
    common.logHttpResponse(log, {'headers': responseHeaders}, 'Check docDB name availability', true);
    if (err) {
      return next(err);
    }
    if (results.length === 0) {
      docDb.createDatabase({id:databaseName}, function(error, database, responseHeaders) {
        common.logHttpResponse(log, {'headers': responseHeaders}, 'Create docDB', true);
        next(error, database);
      });
    } else {
      var error = new Error('The documentdb name is not available.');
      error.statusCode = HttpStatus.CONFLICT;
      next(error);
    }
  });
};

exports.poll = function(databaseName, next) {
    
  var querySpec = {
    query: 'SELECT * FROM root r WHERE r.id = @id',
    parameters: [{
      name: '@id',
      value: databaseName
    }]
  };
    
  docDb.queryDatabases(querySpec).toArray(function(err, results, responseHeaders) {
    common.logHttpResponse(log, {'headers': responseHeaders}, 'Query docDB', true);
    if (err) return next(err, null);
    if (results.length === 0) {
      next(null, null);
    } else {
      next(null, results[0]);
    }
  });
};

exports.deprovision = function(databaseLink, next) {
  docDb.deleteDatabase(databaseLink, function(err, result, responseHeaders) {
    common.logHttpResponse(log, {'headers': responseHeaders}, 'Delete DocDB', true);
    next(err, result);
  });
};

// exports.bind = function(next) {
// there is nothing to do for 'bind' with docDb
// }

// exports.unbind = function(next) {
// there is nothing to do for 'unbind' with docDb
// }
