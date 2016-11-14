/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');
var util = require('util');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var utils = require('./utils');
var config = require('./service');
var common = require('../../common/');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['namespace_name'];
};

Handlers.catalog = function(log, params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(log, params, next) {
  log.debug('Provision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var reqParamsKey = ['resource_group_name', 'namespace_name', 'location', 'type', 'messaging_tier'];
  var errMsg = common.verifyParameters(reqParams, reqParamsKey);
  if (errMsg) {
    return common.handleServiceErrorEx(log, HttpStatus.BAD_REQUEST, errMsg, next);
  }

  var azure_config = {
    resourceGroupName: reqParams[reqParamsKey[0]],
    namespaceName: reqParams[reqParamsKey[1]],
    location: reqParams[reqParamsKey[2]],
    sbType: reqParams[reqParamsKey[3]],
    sbTier: reqParams[reqParamsKey[4]],
    tags: common.mergeTags(reqParams.tags)
  };
  utils.init(params.azure, log);

  async.waterfall([
      async.constant(azure_config),
      utils.getToken,
      utils.checkNamespaceAvailability,
      utils.createResourceGroup,
      utils.createNamespace
    ],
    function(err, resourceGroupName, namespaceName) {
      if (err) {
        common.handleServiceError(log, err, next);
        return;
      } else {
        var reply = {
          statusCode: HttpStatus.ACCEPTED,
          code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          value: {}
        };
        var result = {
          resourceGroupName: resourceGroupName,
          namespaceName: namespaceName
        };
        next(null, reply, result);
    }
  });
};

Handlers.poll = function(log, params, next) {
  log.debug('Poll params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure, log);

  async.waterfall([
      async.constant(azure_config),
      utils.getToken,
      utils.checkNamespaceStatus
    ],
    function(err, state) {
      var reply = {
        state: '',
        description: '',
      };

      var lastOperation = params.last_operation;
      if (lastOperation == 'provision') {
        if (!err) {
          log.info(
            'Getting the provisioning state of the namespace %s: %j',
            namespaceName, state);

          if (state == 'Activating' || state == 'Creating' || state == 'Enabling') {
            reply.state = 'in progress';
            reply.description =
              'Creating the namespace, state: ' +
              state;
          } else if (state == 'Succeeded') {
            reply.state = 'succeeded';
            reply.description =
              'Creating the namespace, state: ' +
              state;
          }
        } else {
          return common.handleServiceError(log, err, function(error) {
            next(error, lastOperation);
          });
        }
      } else if (lastOperation == 'deprovision') {
        if (!err) {
          reply.state = 'in progress';
          reply.description = 'Deleting the namespace';
        } else if (err.statusCode == HttpStatus.NOT_FOUND) {
          reply.state = 'succeeded';
          reply.description = 'Deleting the namespace';
        } else {
          return common.handleServiceError(log, err, function(error) {
            next(error, lastOperation);
          });
        }
      }
      reply = {
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: reply,
      };
      next(null, lastOperation, reply, provisioningResult);
    });

};

Handlers.deprovision = function(log, params, next) {
  log.debug('Deprovision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure, log);

  async.waterfall([
      async.constant(azure_config),
      utils.getToken,
      utils.delNamespace
    ],
    function(err) {
      if (err) {
        common.handleServiceError(log, err, next);
      } else {
        var reply = {
          statusCode: HttpStatus.ACCEPTED,
          code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          value: {}
        };
        next(null, reply, provisioningResult);
      }
    });
};

Handlers.bind = function(log, params, next) {
  log.debug('Bind params: %j', params);
  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure, log);

  async.waterfall([
      async.constant(azure_config),
      utils.getToken,
      utils.listNamespaceKeys
    ],
    function(err, key_name, key_value) {
      if (err) {
        common.handleServiceError(log, err, next);
        return;
      } else {
        var reply = {
          statusCode: HttpStatus.CREATED,
          code: HttpStatus.getStatusText(HttpStatus.CREATED),
          value: {
            credentials: {
              namespace_name: namespaceName,
              shared_access_key_name: key_name,
              shared_access_key_value: key_value
            }
          },
        };
        var result = {};
        next(null, reply, result);
      }
    });
};

Handlers.unbind = function(log, params, next) {
  log.debug('Unbind params: %j', params);

  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  var result = {};
  next(null, reply, result);
};

module.exports = Handlers;
