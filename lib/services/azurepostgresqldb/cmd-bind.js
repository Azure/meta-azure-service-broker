/* jshint camelcase: false */

'use strict';

const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');
const escape = require('pg-escape');
const pgUtils = require('./pg-utils');

const postgresqldbBind = function (params) {

  let provisioningResult = params.provisioning_result;

  log.info(
    util.format(
      'postgresqldb cmd-bind: resourceGroup: %s, postgresqldbName: %s, postgresqlServerName: %s',
      provisioningResult.resourceGroup,
      provisioningResult.postgresqldbName,
      provisioningResult.postgresqlServerName
    )
  );

  this.bind = function (dbConnect) {
    let databaseLogin = pgUtils.generateIdentifier();
    let databaseLoginPassword = pgUtils.generatePassword();
    let client, chainErr;
    let transactionStarted = false;
    return dbConnect({
      host: provisioningResult.postgresqlServerFullyQualifiedDomainName,
      database: provisioningResult.postgresqldbName,
      user: provisioningResult.administratorLogin + '@' + provisioningResult.postgresqlServerName,
      password: provisioningResult.administratorLoginPassword,
      ssl: true
    })
    .then((cl) => {
      client = cl; // Save the client so we can close the connection later
      return client.query('begin');
    })
    .then(() => {
      transactionStarted = true;
      // Create the user role and allow it to log in
      let query = escape(
        'create role %I with password %L login',
        databaseLogin,
        databaseLoginPassword
      );
      return client.query(query);
    })
    .then(() => {
      // Grant the group role to the new user role
      // (The group role has the same name as the database.)
      let query = escape(
        'grant %I to %I',
        provisioningResult.postgresqldbName,
        databaseLogin
      );
      return client.query(query);
    })
    .then(() => {
      // Make the group role the default role for the user's session
      let query = escape(
        'alter role %I set role %I',
        databaseLogin,
        provisioningResult.postgresqldbName
      );
      return client.query(query);
    })
    .then(() => {
      return client.query('commit');
    })
    .catch((err) => {
      // There are things we want to do (like close the db connection)
      // REGARDLESS of whether we had any errors or not, so the next .then(...)
      // is like a "finally" of sorts, however, we want to ensure this whole
      // chain of promises rejects with an error if one was encountered, so
      // we'll save it here and rethrow it later if we need to.
      chainErr = err;
      log.error(err);
      if (transactionStarted) return client.query('rollback');
    })
    .then(() => {
      if (client) client.end();
      if (chainErr) throw chainErr;
      return {
        databaseLogin: databaseLogin,
        databaseLoginPassword: databaseLoginPassword
      };
    });
  };

};

module.exports = postgresqldbBind;
