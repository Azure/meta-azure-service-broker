/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');
var HttpStatus = require('http-status-codes');
var utils = require('./utils');
var common = require('../../common/');
var config = require('./service');
var log = common.getLogger(config.name);

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return config.name + '-' + params.parameters['namespace_name'];
};

Handlers.catalog = function(params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(params, next) {
  log.debug('Provision params: %j', params);

  var reqParams = params.parameters || {};

  var reqParamsKey = ['resource_group_name', 'namespace_name', 'location', 'type', 'messaging_tier'];
  var errMsg = common.verifyParameters(reqParams, reqParamsKey);
  if (errMsg) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, errMsg, next);
  }

  var azure_config = {
    resourceGroupName: reqParams[reqParamsKey[0]],
    namespaceName: reqParams[reqParamsKey[1]],
    location: reqParams[reqParamsKey[2]],
    sbType: reqParams[reqParamsKey[3]],
    sbTier: reqParams[reqParamsKey[4]],
    tags: common.mergeTags(reqParams.tags)
  };
  utils.init(params.azure);

  async.waterfall([
    function(callback) {
      utils.checkNamespaceAvailability(azure_config, callback);
    },
    function(callback) {
      utils.createResourceGroup(azure_config, callback);
    },
    function(callback) {
      utils.createNamespace(azure_config, callback);
    }
  ], function(err) {
    if (err) {
      return common.handleServiceError(err, next);
    }
    var reply = {
      statusCode: HttpStatus.ACCEPTED,
      code: HttpStatus.getStatusText(HttpStatus.ACCEPTED),
      value: {}
    };
    var result = {
      resourceGroupName: azure_config.resourceGroupName,
      namespaceName: azure_config.namespaceName
    };
    next(null, reply, result);
  });
};

Handlers.poll = function(params, next) {
  log.debug('Poll params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.checkNamespaceStatus(azure_config, function(err, state) {
    var reply = {
      state: '',
      description: '',
    };

    var lastOperation = params.last_operation;
    if (lastOperation == 'provision') {
      if (!err) {
        log.info('Getting the provisioning state of the namespace %s: %j', namespaceName, state);

        if (state == 'Activating' || state == 'Creating' || state == 'Enabling') {
          reply.state = 'in progress';
          reply.description = 'Creating the namespace, state: ' + state;
        } else if (state == 'Succeeded') {
          reply.state = 'succeeded';
          reply.description = 'Creating the namespace, state: ' + state;
        }
      } else {
        return common.handleServiceError(err, function(error) {
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
        return common.handleServiceError(err, function(error) {
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

Handlers.deprovision = function(params, next) {
  log.debug('Deprovision params: %j', params);

  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.delNamespace(azure_config, function(err) {
    if (err) {
      common.handleServiceError(err, next);
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

Handlers.bind = function(params, next) {
  log.debug('Bind params: %j', params);
  var provisioningResult = params.provisioning_result;
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var azure_config = {
    resourceGroupName: resourceGroupName,
    namespaceName: namespaceName,
  };
  utils.init(params.azure);

  utils.listNamespaceKeys(azure_config, function(err, key_name, key_value) {
    if (err) {
      return common.handleServiceError(err, next);
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

Handlers.unbind = function(params, next) {
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
