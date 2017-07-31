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
var mysqldbOperations = require('./client');

var Handlers = {};

Handlers.fixParameters = function(parameters) {
  parameters = common.fixParametersWithDefaults('DEFAULT_PARAMETERS_AZURE_MYSQLDB', parameters);
  if (process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] === 'true') {
    // generate server name
    if (!parameters.mysqlServerName) parameters.mysqlServerName = common.generateName();
    
    // generate admin and password
    if (!parameters.mysqlServerParameters) parameters.mysqlServerParameters = {};
    var serverParams = parameters.mysqlServerParameters;
    if (!serverParams.properties) serverParams.properties = {};
    var serverProps = serverParams.properties;
    if (!serverProps.administratorLogin) serverProps.administratorLogin = common.generateName();
    if (!serverProps.administratorLoginPassword) serverProps.administratorLoginPassword = common.generateStrongPassword();
    
    // generate db name
    if (!parameters.mysqlDatabaseName) parameters.mysqlDatabaseName = common.generateName();
  }
  return parameters;
};

Handlers.catalog = function (params, next) {
  var availableEnvironments = ['AzureCloud'];
  if (availableEnvironments.indexOf(params.azure.environment) === -1) {
    return next(null);
  }
  
  var reply = Config;
  next(null, reply);
};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['mysqlServerName'];
};

Handlers.provision = function (params, next) {

  log.debug('MySqlDb/index/provision/params: %j', params);
  
  var cp = new cmdProvision(params);
  log.info('mysqldb index: cmdProvision is newed up');

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.provision(mysqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('mysqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('mysqldb index: cmdDeprovision is newed up');

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cd.deprovision(mysqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { value: result.value }, result.body);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('mysqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.poll(mysqldbOps, function (err, result) {
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

  log.debug('mysqldb/index/bind/params: %j', params);

  var provisioningResult = params.provisioning_result;
  
  var mysqlServerName = provisioningResult.mysqlServerName;
  var mysqlDatabaseName = provisioningResult.mysqlDatabaseName;
  var administratorLogin = provisioningResult.administratorLogin;
  var administratorLoginPassword = provisioningResult.administratorLoginPassword;
  var fqdn = provisioningResult.fullyQualifiedDomainName;
  
  // Spring Cloud Connector Support
  var jdbcUrlTemplate = 'jdbc:mysql://%s:3306' + 
                        '/%s' + 
                        '?user=%s@%s' +
                        '&password=%s' +
                        '&verifyServerCertificate=true' +
                        '&useSSL=true' +
                        '&requireSSL=false';
      
  var jdbcUrl = util.format(jdbcUrlTemplate,
                            fqdn,
                            mysqlDatabaseName,
                            administratorLogin, mysqlServerName,
                            administratorLoginPassword);

  // contents of reply.value winds up in VCAP_SERVICES
  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        mysqlServerName: mysqlServerName,
        mysqlDatabaseName: mysqlDatabaseName,
        mysqlServerFullyQualifiedDomainName: fqdn,
        administratorLogin: administratorLogin,
        administratorLoginPassword: administratorLoginPassword,
        jdbcUrl: jdbcUrl
      }
    }
  };
  next(null, reply, {});

};

Handlers.unbind = function (params, next) {

  log.debug('mysqldb/index/unbind/params: %j', params);
  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  next(null, reply, {});
};

module.exports = Handlers;
