/* jshint camelcase: false */
/* jshint newcap: false */

var docDbClient = require('documentdb').DocumentClient;

var docDb;
var hostEndPoint = process.env['docDb_hostEndPoint'];
var masterKey = process.env['docDb_masterKey'];

exports.instantiate = function() {
    docDb = new docDbClient(hostEndPoint, {masterKey:masterKey});
    // console.log('docDb-client instantiate: docDb object: %j', docDb);
};

exports.provision = function(databaseName, next) {
    docDb.createDatabase({id:databaseName}, function(err, database) {
        next(err, database);
    });
};

exports.poll = function(databaseName, next) {
    
    var querySpec = {
        query: 'SELECT * FROM root r WHERE r.id = @id',
        parameters: [
            {
                name: '@id',
                value: databaseName
            }
        ]
    };
    
    docDb.queryDatabases(querySpec).toArray(function(err, results) {
        if (err) return next(err, null);
        if (results.length === 0) {
            next(null, null);
        } else {
            next(null, results[0]);
        }
    });
};

exports.deprovision = function(databaseLink, next) {
    docDb.deleteDatabase(databaseLink, function(err, result) {
        next(err, result);
    });
};

// exports.bind = function(next) {
// there is nothing to do for 'bind' with docDb
// }

// exports.unbind = function(next) {
// there is nothing to do for 'unbind' with docDb
// }