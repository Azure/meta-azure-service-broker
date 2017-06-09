/* jshint camelcase: false */

'use strict';

const util = require('util');
const msRestAzure = require('ms-rest-azure');
const HttpStatus = require('http-status-codes');
const Config = require('./service');
const common = require('../../common/');
const log = common.getLogger(Config.name);
const CmdProvision = require('./cmd-provision');
const CmdPoll = require('./cmd-poll');
const CmdDeprovision = require('./cmd-deprovision');
const CmdBind = require('./cmd-bind');
const CmdUnbind = require('./cmd-unbind');
const PostgreSQLManagementClient = require('azure-arm-postgresql');
const ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
const pg = require('pg');

const Handlers = {};

function login(params) {
  return msRestAzure.loginWithServicePrincipalSecret(
    params.azure.clientId,
    params.azure.clientSecret,
    params.azure.tenantId
  );
}

function dbConnect(config) {
  return new Promise((resolve, reject) => {
    let client = new pg.Client(config);
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
        resolve(client);
      }
    });
  });
}

Handlers.catalog = function (params, next) {
  next(null, Config);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters.postgresqlServerName + '-' + params.parameters.postgresqldbName;
};

Handlers.provision = function (params, next) {
  log.debug('PostgreSqlDB/index/provision/params: %j', params);

  let cp = new CmdProvision(params);
  let pmc;
  let rmc;
  login(params)
  .then((credentials) => {
    let endpointUrl = common.getEnvironment(
      params.azure.environment
    ).resourceManagerEndpointUrl;
    pmc = new PostgreSQLManagementClient(
      credentials,
      params.azure.subscriptionId,
      endpointUrl
    );
    rmc = new ResourceManagementClient(
      credentials,
      params.azure.subscriptionId,
      endpointUrl
    );
    return cp.validate(pmc);
  })
  .then(() => {
    return cp.provision(pmc, rmc, dbConnect, function() {
      let reqParams = params.parameters;
      next(
        null,
        {
          statusCode: HttpStatus.ACCEPTED,
          code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          value: {},
        },
        {
          resourceGroup: reqParams.resourceGroup,
          postgresqlServerName: reqParams.postgresqlServerName,
          postgresqldbName: reqParams.postgresqldbName,
          administratorLogin: reqParams.postgresqlServerParameters.properties.administratorLogin,
          administratorLoginPassword: reqParams.postgresqlServerParameters.properties.administratorLoginPassword
        }
      );
    });
  })
  .catch((err) => {
    if (err.isValidationError) {
      if (err.invalidParams) {
        common.handleServiceErrorEx(
          HttpStatus.BAD_REQUEST,
          util.format(
            'Parameter validation failed. Please check your parameters: %s',
            err.invalidParams.join(', ')
          ),
          next
        );
      } else {
        common.handleServiceErrorEx(
          HttpStatus.BAD_REQUEST,
          err.message,
          next
        );
      }
    } else {
      common.handleServiceErrorEx(err, next);
    }
  });

};

Handlers.poll = function (params, next) {
  log.debug('PostgreSqlDb/index/poll/params: %j', params);

  let lastOperation = params.last_operation;

  login(params)
  .then((credentials) => {
    let pmc = new PostgreSQLManagementClient(
      credentials,
      params.azure.subscriptionId,
      common.getEnvironment(params.azure.environment).resourceManagerEndpointUrl
    );
    let cp = new CmdPoll(params);
    return cp.poll(pmc, dbConnect);
  })
  .then((reply) => {
    params.provisioning_result.postgresqlServerFullyQualifiedDomainName = reply.postgresqlServerFullyQualifiedDomainName;
    delete reply.postgresqlServerFullyQualifiedDomainName;
    next(
      null,
      lastOperation,
      { 
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: reply
      },
      params.provisioning_result
    );
  })
  .catch((err) => {
    common.handleServiceError(err, next);
  });
};

Handlers.deprovision = function (params, next) {
  log.debug('PostgreSqlDb/index/deprovision/params: %j', params);

  login(params)
  .then((credentials) => {
    let pmc = new PostgreSQLManagementClient(
      credentials,
      params.azure.subscriptionId,
      common.getEnvironment(params.azure.environment).resourceManagerEndpointUrl
    );
    let cd = new CmdDeprovision(params);
    return cd.deprovision(pmc);
  })
  .then(() => {
    next(
      null,
      {
        statusCode: HttpStatus.ACCEPTED,
        code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
        value: {}
      },
      null
    );
  })
  .catch((err) => {
    common.handleServiceError(err, next);
  });
};

Handlers.bind = function (params, next) {
  log.debug('PostgreSqlDb/index/bind/params: %j', params);

  let cb = new CmdBind(params);
  return cb.bind(dbConnect)
  .then((reply) => {
    let provisioningResult = params.provisioning_result;
    // Spring Cloud Connector Support
    let jdbcUrlTemplate = 'jdbc:postgresql://%s:5432' +
                          '/%s' +
                          '?user=%s@%s' +
                          '&password=%s' +
                          '&ssl=true';
    let jdbcUrl = util.format(
      jdbcUrlTemplate,
      provisioningResult.postgresqlServerFullyQualifiedDomainName,
      provisioningResult.postgresqldbName,
      reply.databaseLogin,
      provisioningResult.postgresqlServerName,
      reply.databaseLoginPassword
    );
    next(
      null,
      {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            postgresqlServerName: provisioningResult.postgresqlServerName,
            postgresqlServerFullyQualifiedDomainName: provisioningResult.postgresqlServerFullyQualifiedDomainName,
            postgresqldbName: provisioningResult.postgresqldbName,
            databaseLogin: reply.databaseLogin,
            databaseLoginPassword: reply.databaseLoginPassword,
            jdbcUrl: jdbcUrl
          }
        }
      },
      {
        databaseLogin: reply.databaseLogin
      }
    );
  })
  .catch((err) => {
    common.handleServiceError(err, next);
  });
};

Handlers.unbind = function (params, next) {
  log.debug('PostgreSqlDb/index/unbind/params: %j', params);

  let cu = new CmdUnbind(params);
  return cu.unbind(dbConnect)
  .then(() => {
    next(
      null,
      {
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: {},
      },
      null
    );
  })
  .catch((err) => {
    common.handleServiceError(err, next);
  });
};

module.exports = Handlers;
