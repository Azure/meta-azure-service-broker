/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var async = require('async');
var _ = require('underscore');
var utils = require('./utils');
var config = require('./service');

// Default Config
var LOCATION = 'East US';
var LOCATION_CHINA = 'China East';
var RESOURCE_GROUP_NAME_PREFIX = 'cloud-foundry-';
var NAMESPACE_NAME_PREFIX = 'cf';
var SB_TYPE = 'Messaging';
var MESSAGING_TIER = 'Standard';

var ServiceError = function(err) {
  var error = {};
  if (_.has(err, 'statusCode')) {
    error = {
      statusCode: err.statusCode,
      code: err.code,
      description: err.message,
    };
  } else {
    error = {
      statusCode: 400,
      code: 'Bad Request',
      description: err.message,
    };
  }
  return error;
};

var Handlers = {};

Handlers.catalog = function(log, params, next) {
  log.debug('Catalog params: %j', params);

  var reply = config;
  next(null, reply);
};

Handlers.provision = function(log, params, next) {
  log.debug('Provision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = _.has(reqParams, 'resource_group_name') ? reqParams.resource_group_name : RESOURCE_GROUP_NAME_PREFIX + instanceId;
  var namespaceName = _.has(reqParams, 'namespace_name') ? reqParams.namespace_name : NAMESPACE_NAME_PREFIX + instanceId;

  var location;
  if (_.has(reqParams, 'location')) {
    location = reqParams.location;
  } else {
    location = LOCATION;
    if (params.azure.environment === 'AzureChinaCloud') {
      location = LOCATION_CHINA;
    }
  }

  var sbType;
  if (_.has(reqParams, 'type')) {
    sbType = reqParams.type;
  } else {
    sbType = SB_TYPE;
  }

  var sbTier;
  if (_.has(reqParams, 'messaging_tier')) {
    sbTier = reqParams.messaging_tier;
  } else {
    sbTier = MESSAGING_TIER;
  }

  var config = {
    resourceGroupName : resourceGroupName,
    namespaceName : namespaceName,
    location : location,
    sbType : sbType,
    sbTier : sbTier
  };
  utils.init(params.azure, config);

  async.waterfall([
      utils.getToken,
      utils.createResourceGroup,
      utils.createNamespace
    ],
    function(err, resourceGroupName, NamespaceName) {
      if (err) {
        var error = ServiceError(err);
        log.error('%j', error);
        return next(error);
      } else {
        var reply = {
          statusCode: 202,
          code: 'Accepted',
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

  var config = {
    resourceGroupName : resourceGroupName,
    namespaceName : namespaceName,
  };
  utils.init(params.azure, config);

  async.waterfall([
      utils.getToken,
      utils.getNamespace
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
          var error = ServiceError(err);
          log.error(error);
          return next(error);
        }
      } else if (lastOperation == 'deprovision') {
        if (!err) {
          reply.state = 'in progress';
          reply.description = 'Deleting the namespace';
        } else if (err.statusCode == 404) {
          reply.state = 'succeeded';
          reply.description = 'Deleting the namespace';
        } else {
          var error = ServiceError(err);
          log.error(error);
          return next(error);
        }
      }
      reply = {
        statusCode: 200,
        code: 'OK',
        value: reply,
      };
      next(null, reply, provisioningResult);
    });

};

Handlers.deprovision = function(log, params, next) {
  log.debug('Deprovision params: %j', params);

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var namespaceName = provisioningResult.namespaceName;

  var config = {
    resourceGroupName : resourceGroupName,
    namespaceName : namespaceName,
  };
  utils.init(params.azure, config);

  async.waterfall([
      utils.getToken,
      utils.delNamespace
    ],
    function(err) {
      if (err) {
        var error = ServiceError(err);
        log.error(error);
        return next(error);
      } else {
        var reply = {
          statusCode: 202,
          code: 'Accepted',
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

  var config = {
    resourceGroupName : resourceGroupName,
    namespaceName : namespaceName,
  };
  utils.init(params.azure, config);

  async.waterfall([
      utils.getToken,
      utils.listNamespaceKeys
    ],
    function(err, key_name, key_value) {
      if (err) {
        var error = ServiceError(err);
        log.error(error);
        return next(error);
      } else {
        var reply = {
          statusCode: 201,
          code: 'Created',
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
          statusCode: 200,
          code: 'OK',
          value: {},
        };
        var result = {};
        next(null, reply, result);
};

module.exports = Handlers;
