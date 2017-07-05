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
var postgresqldbOperations = require('./client');

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_POSTGRESQLDB', parameters);
  if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
    if (!parameters.postgresqlServerName) parameters.postgresqlServerName = common.generateName();
    
    if (!parameters.postgresqlServerParameters) parameters.postgresqlServerParameters = {};
    var serverParams = parameters.postgresqlServerParameters;
    if (!serverParams.properties) serverParams.properties = {};
    var serverProps = serverParams.properties;
    if (!serverProps.administratorLogin) serverProps.administratorLogin = common.generateName();
    if (!serverProps.administratorLoginPassword) serverProps.administratorLoginPassword = common.generateStrongPassword();
  }
  return parameters;
};

Handlers.catalog = function (params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['postgresqlServerName'];
};

Handlers.provision = function (params, next) {

  log.debug('PostGreSqlDb/index/provision/params: %j', params);
  
  if (params.azure.environment === 'AzureChinaCloud') {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, 'Azure China Cloud doesn\'t support to create PostgreSql DB for now.', next);
  }
  
  var cp = new cmdProvision(params);
  log.info('postgresqldb index: cmdProvision is newed up');

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var postgresqldbOps = new postgresqldbOperations(params.azure);
  log.info('postgresqldb index: postgresqldbOps is newed up');

  cp.provision(postgresqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('postgresqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('postgresqldb index: cmdDeprovision is newed up');

  var postgresqldbOps = new postgresqldbOperations(params.azure);
  log.info('postgresqldb index: postgresqldbOps is newed up');

  cd.deprovision(postgresqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('postgresqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var postgresqldbOps = new postgresqldbOperations(params.azure);
  log.info('postgresqldb index: postgresqldbOps is newed up');

  cp.poll(postgresqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else {
      next(null, lastOperation, { value: result.value }, result.body);
    }
  });

};

Handlers.bind = function (params, next) {

  log.debug('postgresqldb/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;
  
  var postgresqlServerName = provisioningResult.postgresqlServerName;
  var administratorLogin = provisioningResult.administratorLogin;
  var administratorLoginPassword = provisioningResult.administratorLoginPassword;
  var fqdn = provisioningResult.fullyQualifiedDomainName;
  
  // Spring Cloud Connector Support
  var jdbcUrlTemplate = 'jdbc:postgresql://%s:5432' + 
                        '/{your_database}' +
                        '?user=%s@%s' +
                        '&password=%s' +
                        '&ssl=true';
  var jdbcUrl = util.format(jdbcUrlTemplate,
                            fqdn,
                            administratorLogin,
                            postgresqlServerName,
                            administratorLoginPassword);
                      
  // contents of reply.value winds up in VCAP_SERVICES
  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        postgresqlServerName: postgresqlServerName,
        postgresqlServerFullyQualifiedDomainName: fqdn,
        administratorLogin: administratorLogin,
        administratorLoginPassword: administratorLoginPassword,
        jdbcUrl: jdbcUrl
      }
    }
  };
  next(null, reply, {});

};

Handlers.unbind = function (params, next) {

  log.debug('postgresqldb/index/unbind/params: %j', params);
  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  next(null, reply, {});
};

module.exports = Handlers;
