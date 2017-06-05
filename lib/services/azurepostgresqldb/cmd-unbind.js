/* jshint camelcase: false */

'use strict';

const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');
const escape = require('pg-escape');

const postgresqlUnbind = function (params) {

  let provisioningResult = params.provisioning_result;
  let bindingResult = params.binding_result;

  log.info(
    util.format(
      'postgresql cmd-unbind: resourceGroup: %s, postgresqldbName: %s, postgresqlServerName: %s',
      provisioningResult.resourceGroup,
      provisioningResult.postgresqldbName,
      provisioningResult.postgresqlServerName
    )
  );

  this.unbind = function (dbConnect) {
    let client, chainErr;
    // Use a factory method to get the db connection
    return dbConnect({
      host: provisioningResult.postgresqlServerFullyQualifiedDomainName,
      database: provisioningResult.postgresqldbName,
      user: provisioningResult.administratorLogin + '@' + provisioningResult.postgresqlServerName,
      password: provisioningResult.administratorLoginPassword,
      ssl: true
    })
    .then((cl) => {
      client = cl; // Save the client so we can close the connection later
      let query = escape('drop role %I', bindingResult.databaseLogin);
      return client.query(query);
    })
    .catch((err) => {
      // There are things we want to do (like close the db connection)
      // REGARDLESS of whether we had any errors or not, so the next .then(...)
      // is like a "finally" of sorts, however, we want to ensure this whole
      // chain of promises rejects with an error if one was encountered, so
      // we'll save it here and rethrow it later if we need to.
      chainErr = err;
      log.error(err);
    })
    .then(() => {
      if (client) client.end();
      if (chainErr) throw chainErr;
    });
  };

};

module.exports = postgresqlUnbind;
