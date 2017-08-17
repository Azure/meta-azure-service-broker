/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common/');
var log = common.getLogger(Config.name);
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind.js');
var cmdUnbind = require('./cmd-unbind.js');
var cmdUpdate = require('./cmd-update.js');
var sqldbOperations = require('./client');
var deepExtend = require('deep-extend');
var urlencode = require('urlencode');

var Handlers = {};

Handlers.fixParameters = function(parameters, accountPool) {

  if (parameters.sqlServerName && parameters.sqlServerName in accountPool.sqldb) { // assume user wants to create db on an existing server
    if (process.env['DEFAULT_PARAMETERS_AZURE_SQLDB']) {
      var defaultParams = JSON.parse(process.env['DEFAULT_PARAMETERS_AZURE_SQLDB']);
      // For creating db on an existing server, following default parameters should be deleted. The broker gets these info in provision.
      delete defaultParams.resourceGroup;
      delete defaultParams.location;
      delete defaultParams.sqlServerName;
      delete defaultParams.sqlServerParameters;

      // The right overwrites the left if conflict
      parameters = deepExtend(defaultParams, parameters);
    }

    if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
      if (!parameters.sqldbName) parameters.sqldbName = common.generateName();
    }

    return parameters;

  } else {
    parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_SQLDB', parameters);
    if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
      if (!parameters.sqlServerName) parameters.sqlServerName = common.generateName();
      if (!parameters.sqldbName) parameters.sqldbName = common.generateName();

      if (!parameters.sqlServerParameters) parameters.sqlServerParameters = {};
      var serverParams = parameters.sqlServerParameters;
      if (!serverParams.properties) serverParams.properties = {};
      var serverProps = serverParams.properties;
      if (!serverProps.administratorLogin) serverProps.administratorLogin = common.generateName();
      if (!serverProps.administratorLoginPassword) serverProps.administratorLoginPassword = common.generateStrongPassword();
    }

    return parameters;
  }
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['sqlServerName'] + '-' + params.parameters['sqldbName'];
};

Handlers.catalog = function (params, next) {
  var availableEnvironments = ['AzureCloud', 'AzureGermanCloud', 'AzureChinaCloud', 'AzureUSGovernment'];
  if (availableEnvironments.indexOf(params.azure.environment) === -1) {
    return next(null);
  }
  
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (params, next) {

  log.debug('SqlDb/index/provision/params: %j', params);

  var cp = new cmdProvision(params);
  log.info('sqldb index: cmdProvision is newed up');

  // add in the static data for the selected plan
  cp.fixupParameters();

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.provision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.ACCEPTED, value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('sqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('sqldb index: cmdDeprovision is newed up');

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cd.deprovision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.OK, value: result }, params.provisioning_result);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('sqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var sqldbOps = new sqldbOperations(params.azure);
  log.info('sqldb index: sqldbOps is newed up');

  cp.poll(sqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else if (result.statusCode === HttpStatus.OK) {
      next(null, lastOperation, { statusCode: HttpStatus.OK, value: result.value }, result.body);
    } else {
      next(null, lastOperation, { statusCode: result.statusCode, value: result.value }, result.body);
    }
  });


};

Handlers.bind = function (params, next) {

  log.debug('sqldb/index/bind/params: %j', params);

  var cp = new cmdBind(params);
  var sqldbOps = new sqldbOperations(params.azure);

  cp.bind(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      var provisioningResult = params.provisioning_result;
      var sqldbName = provisioningResult.name;
      var sqlServerName = provisioningResult.sqlServerName;
      var databaseLogin = result.databaseLogin;
      var databaseLoginPassword = urlencode(result.databaseLoginPassword);
            
      var fqdn = provisioningResult.fullyQualifiedDomainName;
      // Spring Cloud Connector Support
      var jdbcUrlTemplate = 'jdbc:sqlserver://%s:1433;' +
                            'database=%s;' +
                            'user=%s;' +
                            'password=%s;' +
                            'Encrypt=true;' +
                            'TrustServerCertificate=false;' +
                            'HostNameInCertificate=%s;' +
                            'loginTimeout=30;';

      var jdbcUrl = util.format(jdbcUrlTemplate,
                                fqdn,
                                sqldbName,
                                databaseLogin,
                                databaseLoginPassword,
                                fqdn.replace(/.+\.database/, '*.database'));

      // Differences between auditing enabled and disabled: https://docs.microsoft.com/en-us/azure/sql-database/sql-database-auditing-and-dynamic-data-masking-downlevel-clients
      var jdbcUrlForAuditingEnabled = util.format(jdbcUrlTemplate,
                                                  fqdn.replace(/\.database/, '.database.secure'),
                                                  sqldbName,
                                                  databaseLogin,
                                                  databaseLoginPassword,
                                                  fqdn.replace(/.+\.database/, '*.database.secure'));

      var uri = util.format('mssql://%s:%s@%s:1433/%s?encrypt=true&TrustServerCertificate=false&HostNameInCertificate=%s',
                            databaseLogin,
                            databaseLoginPassword,
                            fqdn,
                            sqldbName,
                            fqdn.replace(/.+\.database/, '%2A.database'));

      // contents of reply.value winds up in VCAP_SERVICES
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            sqldbName: sqldbName,
            sqlServerName: sqlServerName,
            sqlServerFullyQualifiedDomainName: fqdn,
            databaseLogin: databaseLogin,
            databaseLoginPassword: databaseLoginPassword,
            jdbcUrl: jdbcUrl,
            jdbcUrlForAuditingEnabled: jdbcUrlForAuditingEnabled,
            hostname: fqdn,
            port: 1433,
            name: sqldbName,
            username: databaseLogin, 
            password: databaseLoginPassword,
            uri: uri
          }
        }
      };

      next(null, reply, result);
    }
  });

};

Handlers.unbind = function (params, next) {

  log.debug('sqldb/index/unbind/params: %j', params);

  var cp = new cmdUnbind(params);
  var sqldbOps = new sqldbOperations(params.azure);

  cp.unbind(sqldbOps, function (err) {
    if (err) {
      return common.handleServiceError(err, next);
    }
    var reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: {},
    };
    next(null, reply, {});
  });
};

Handlers.update = function (params, next) {
  log.debug('sqldb/index/update params=%j', params);

  var cp = new cmdUpdate(params);
  var sqldbOps = new sqldbOperations(params.azure);

  cp.update(sqldbOps, function (err, reply, newInstance) {
    if (err) {
      return common.handleServiceError(err, next);
    }

    log.debug('sqldb/index/update/reply: %j', reply);
    next(null, reply, newInstance);
  });
};

module.exports = Handlers;
