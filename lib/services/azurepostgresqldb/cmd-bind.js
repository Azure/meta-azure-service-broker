/* jshint camelcase: false */

'use strict';

const _ = require('underscore');
const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');
const escape = require('pg-escape');

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
    let uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercaseLetters = uppercaseLetters.toLowerCase();
    let numbers = '1234567890';

    let databaseLogin = _.sample(lowercaseLetters) +
                        _.sample(lowercaseLetters + numbers, 9).join('');

    function getRandomInt (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    Array.prototype.shuffle = function() {
      for (let i = this.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = this[i];
        this[i] = this[j];
        this[j] = temp;
      }
      return this;
    };

    // Generate password
    let passwordLength = 10;
    let databaseLoginPassword = '';
    let upperLength = getRandomInt(1, passwordLength-2);
    databaseLoginPassword += _.sample(uppercaseLetters, upperLength).join('');
    let lowerLength = getRandomInt(1, passwordLength-upperLength-1);
    databaseLoginPassword +=  _.sample(lowercaseLetters, lowerLength).join('');
    let numLength = passwordLength - upperLength - lowerLength;
    databaseLoginPassword +=  _.sample(numbers, numLength).join('');
    databaseLoginPassword = databaseLoginPassword.split('').shuffle().join('');

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
