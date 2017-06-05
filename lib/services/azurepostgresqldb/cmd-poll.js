/* jshint camelcase: false */

'use strict';

const HttpStatus = require('http-status-codes');
const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');
const escape = require('pg-escape');

const postgresqldbPoll = function (params) {

  let provisioningResult = params.provisioning_result;

  log.info(
    util.format(
      'postgresqldb cmd-poll: resourceGroup: %s, postgresqldbName: %s, postgresqlServerName: %s',
      provisioningResult.resourceGroup,
      provisioningResult.postgresqldbName,
      provisioningResult.postgresqlServerName
    )
  );

  this.poll = function (client, dbConnect) {
    if (params.last_operation === 'provision') {
      let fullyQualifiedDomainName, dbClient;
      return client.servers.get(
        provisioningResult.resourceGroup,
        provisioningResult.postgresqlServerName
      )
      .then((server) => {
        fullyQualifiedDomainName = server.fullyQualifiedDomainName;
        return client.databases.get(
          provisioningResult.resourceGroup,
          provisioningResult.postgresqlServerName,
          provisioningResult.postgresqldbName
        );
      })
      .then(() => {
        // If we get to here, the database exists... we need to connect to it
        // and verify that it's owned by the correct (group) role (the one
        // with the same name as the database itself) as that will be the true
        // indication that the provisioning process is 100% complete.
        return dbConnect({
          host: fullyQualifiedDomainName,
          database: provisioningResult.postgresqldbName,
          user: provisioningResult.administratorLogin + '@' + provisioningResult.postgresqlServerName,
          password: provisioningResult.administratorLoginPassword,
          ssl: true
        });
      })
      .then((dbCl) => {
        dbClient = dbCl; // Save the client so we can close the connection later
        let query = escape(
          'select pg_catalog.pg_get_userbyid(datdba) as owner from pg_catalog.pg_database where datname = %L',
          provisioningResult.postgresqldbName
        );
        return dbClient.query(query);
      })
      .then((result) => {
        // Provisioning isn't complete if the db isn't owned by a role of the
        // same name
        if (result.rows[0].owner !== provisioningResult.postgresqldbName) {
          let err = new Error();
          err.reason = 'wrong owner';
          throw err;
        }
      })
      .then(() => {
        return {
          state: 'succeeded',
          description: util.format(
            'Created database %s on server %s.',
            provisioningResult.postgresqldbName,
            provisioningResult.postgresqlServerName
          ),
          postgresqlServerFullyQualifiedDomainName: fullyQualifiedDomainName
        };
      })
      .catch((err) => {
        if (dbClient) dbClient.end();
        if (
          (err.statusCode !== HttpStatus.NOT_FOUND) &&
          (err.reason !== 'wrong owner')
        ) throw err;
        return {
          state: 'in progress',
          description: util.format(
            'Creating database %s on server %s.',
            provisioningResult.postgresqldbName,
            provisioningResult.postgresqlServerName
          )
        };
      });
    } else if (params.last_operation === 'deprovision') {
      return client.servers.get(
        provisioningResult.resourceGroup,
        provisioningResult.postgresqlServerName
      )
      .then(() => {
        return {
          state: 'in progress',
          description: util.format(
            'Deleting database %s on server %s.',
            provisioningResult.postgresqldbName,
            provisioningResult.postgresqlServerName
          )
        };
      })
      .catch((err) => {
        if (err.statusCode !== HttpStatus.NOT_FOUND) {
          throw err;
        }
        return {
          state: 'succeeded',
          description: util.format(
            'Deleted database %s on server %s.',
            provisioningResult.postgresqldbName,
            provisioningResult.postgresqlServerName
          )
        };
      });
    }
    return Promise.reject(
      new Error(util.format(
        'Unrecognized lastoperation %s'),
        params.last_operation
      )
    );
  };

};

module.exports = postgresqldbPoll;
