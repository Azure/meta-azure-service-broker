const common = require('../../lib/common');
const statusCode = require('./statusCode');
const pg = require('pg');

module.exports = function(environment) {
  let log = common.getLogger('azurepostgresqldbClient');

  this.validateCredential = function(credentials, next) {

    let client = new pg.Client({
      host: credentials.postgresqlServerFullyQualifiedDomainName,
      database: credentials.postgresqldbName,
      user: credentials.databaseLogin + '@' + credentials.postgresqlServerName,
      password: credentials.databaseLoginPassword,
      ssl: true
    });

    new Promise((resolve, reject) => {
      client.connect(function (err) {
        if (err) {
          reject(err);
        } else {
          // Workaround: Mainly during testing, encountering many cases of
          // connection reset by peer. We'll log and eat errors from IDLE
          // connections. This should be a harmless thing to do. The broker
          // doesn't interact with any given Postgres database with any real
          // frequency, so we use no connection pooling. i.e. Every connection
          // is intended to standalone and be discarded after a single use
          // anyway. Note that this will not eat errors caused by a query.
          // Those will still be handled by the catch in the promise chain.
          client.on('error', function(err) {
            log.warn(err);
          });
          resolve();
        }
      });
    })
    .then(() => {
      return client.query('CREATE TABLE testtable(aaa char(10))');
    })
    .then(() => {
      log.debug('The user can create a new table in the PostgreSQL database.');
      return client.query('INSERT INTO testtable(aaa) values (\'bbb\')');
    })
    .then(() => {
      log.debug('The user can insert a new row to the new table.');
      return client.query('SELECT * FROM testtable');
    })
    .then(() => {
      log.debug('The user can get the row inserted.');
      client.end(function(err){
        if (err) {
          log.error(err);
        }
        setTimeout(next, 5000, statusCode.PASS);
      });
    })
    .catch((err) => {
      log.error(err);
      next(statusCode.FAIL);
      client.end(function(err){
        if (err) {
          log.error(err);
        }
      });
    });

  };

};
