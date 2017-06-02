/* jshint camelcase: false */

'use strict';

const _ = require('underscore');
const HttpStatus = require('http-status-codes');
const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');
const escape = require('pg-escape');

const postgresqldbProvision = function (params) {

  let reqParams = params.parameters || {};

  let resourceGroup = reqParams.resourceGroup || '';
  let location = reqParams.location || '';

  let postgresqlServerName = reqParams.postgresqlServerName || '';
  let postgresqldbName = reqParams.postgresqldbName || '';

  let administratorLogin = null, administratorLoginPassword = null;
  if (reqParams.postgresqlServerParameters) {
    let properties = reqParams.postgresqlServerParameters.properties;
    if (properties) {
      administratorLogin = properties.administratorLogin;
      administratorLoginPassword = properties.administratorLoginPassword;
    }
  }

  log.info(
    util.format(
      'postgresqldb cmd-provision: resourceGroup: %s, postgresqldbName: %s, postgresqlServerName: %s',
      resourceGroup,
      postgresqldbName,
      postgresqlServerName
    )
  );

  let firewallRules = null;

  if (!_.isUndefined(reqParams.postgresqlServerParameters)) {
    if (!_.isUndefined(reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules)) {
      firewallRules = reqParams.postgresqlServerParameters.allowPostgresqlServerFirewallRules;
    }
  }

  this.validate = function (client) {

    function validateFirewallRules() {
      if (!firewallRules) return true; // no firewall rule at all is ok
      if (!(firewallRules instanceof Array)) return false;
      for (let i = 0; i < firewallRules.length; i++) {
        let rule = firewallRules[i];
        if (!rule.ruleName) return false;
        if (!rule.startIpAddress) return false;
        if (!_.isString(rule.startIpAddress)) return false;
        if (rule.startIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) return false;
        if (!rule.endIpAddress) return false;
        if (!_.isString(rule.endIpAddress)) return false;
        if (rule.endIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) return false;
      }
      return true;
    }

    function getServer(client) {
      return client.servers.get(resourceGroup, postgresqlServerName);
    }

    let invalidParams = [];
    let names = ['resourceGroup', 'location', 'postgresqlServerName', 'postgresqldbName', 'administratorLogin', 'administratorLoginPassword'];
    let values = [resourceGroup, location, postgresqlServerName, postgresqldbName, administratorLogin, administratorLoginPassword];
    for (let i = 0; i < names.length; i++) {
      if (!_.isString(values[i]) || values[i].length === 0) {
        invalidParams.push(names[i]);
      }
    }

    if (!validateFirewallRules()) invalidParams.push('allowPostgresqlServerFirewallRules');

    if (invalidParams.length === 0) {
      // See if a server with this name already exists. If it does, this
      // is a problem.
      return getServer(client)
      .then(() => {
        // A server with this name already exists-- which is a problem
        let err = new Error('The server name is unavailable');
        err.isValidationError = true;
        throw err;
      })
      .catch((err) => {
        // If the error is a 404, we're ok, but if it's anything else, throw it
        if (err.statusCode != HttpStatus.NOT_FOUND) {
          throw err;
        }
      });
    }

    // If we get to here, there were validation errors
    let err = new Error('Validation errors');
    err.isValidationError = true;
    err.invalidParams = invalidParams;
    return Promise.reject(err);

  };

  this.provision = function (client, resourceClient, dbConnect, callback) {

    function getResourceGroup(client) {
      return client.resourceGroups.get(resourceGroup);
    }

    function createResourceGroup(client) {
      return client.resourceGroups.createOrUpdate(
        resourceGroup,
        {
          location: location,
        }
      );
    }

    function createServer(client) {
      return client.servers.createOrUpdate(
        resourceGroup,
        postgresqlServerName, {
          location: location,
          properties: {
            createMode: 'Default',
            administratorLogin: administratorLogin,
            administratorLoginPassword: administratorLoginPassword
          }
        }
      );
    }

    function createFirewallRule(client, rule) {
      return client.firewallRules.createOrUpdate(
        resourceGroup,
        postgresqlServerName,
        rule.ruleName,
        {
          startIpAddress: rule.startIpAddress,
          endIpAddress: rule.endIpAddress
        }
      );
    }

    function createDatabase(client) {
      return client.databases.createOrUpdate(
        resourceGroup,
        postgresqlServerName,
        postgresqldbName,
        {}
      );
    }

    let dbClient, chainErr, postgresqlServerFullyQualifiedDomainName;
    let invokedCallback = false;
    let dbTransactionStarted = false;
    return getResourceGroup(resourceClient)
    .catch((err) => {
      if (err.statusCode == HttpStatus.NOT_FOUND) {
        // Recover by creating the resource group
        return createResourceGroup(resourceClient);
      }
      throw err;
    })
    .then(() => {
      // TODO: We really shouldn't do this until the create request is accepted
      callback(); // This should trigger a response to the waiting client
      invokedCallback = true;
      return createServer(client);  
    })
    .then(() => {
      return client.servers.get(resourceGroup, postgresqlServerName);
    })
    .then((server) => {
      postgresqlServerFullyQualifiedDomainName = server.fullyQualifiedDomainName;
      if (firewallRules) {
        let fps = [];
        for (let i = 0; i < firewallRules.length; i++) {
          fps.push(createFirewallRule(client, firewallRules[i]));
        }
        return Promise.all(fps);
      }
    })
    .then(() => {
      return createDatabase(client);
    })
    .then(() => {
      return dbConnect({
        host: postgresqlServerFullyQualifiedDomainName,
        database: postgresqldbName,
        user: administratorLogin + '@' + postgresqlServerName,
        password: administratorLoginPassword,
        ssl: true
      });
    })
    .then((dbCl) => {
      dbClient = dbCl; // Save the client so we can close the connection later
      return dbClient.query('begin');
    })
    .then(() => {
      dbTransactionStarted = true;
      let query = escape('create role %I', postgresqldbName);
      return dbClient.query(query);
    })
    .then(() => {
      let query = escape(
        'grant %I to %I',
        postgresqldbName,
        administratorLogin
      );
      return dbClient.query(query);
    })
    .then(() => {
      let query = escape(
        'alter database %I owner to %I',
        postgresqldbName,
        postgresqldbName
      );
      return dbClient.query(query);
    })
    .then(() => {
      return dbClient.query('commit');
    })
    .catch((err) => {
      // There are things we want to do (like close the db connection)
      // REGARDLESS of whether we had any errors or not, so the next .then(...)
      // is like a "finally" of sorts, however, we want to ensure this whole
      // chain of promises rejects with an error if one was encountered, so
      // we'll save it here and rethrow it later if we need to.
      chainErr = err;
      log.error(err);
      if (dbTransactionStarted) return dbClient.query('rollback');
    })
    .then(() => {
      if (dbClient) dbClient.end();
      // If there are any errors, return them instead of throwing them.
      // We've already responded to the client by now (see callback call
      // above), so any error that occurs at this point shouldn't cause the
      // whole chain to be rejected or else we'll be responding a second
      // time and that will cause an error.
      if (chainErr) {
        if (invokedCallback) return chainErr;
        throw chainErr;
      }
    });

  };

};

module.exports = postgresqldbProvision;
