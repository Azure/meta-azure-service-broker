/*
 * Cloud Foundry Services Connector
 * Copyright (c) 2014 ActiveState Software Inc. All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

'use strict';

var azure = require('azure-storage');

var Database = function(opts) {

  this.opts = opts || {};
  this.instanceTableName = 'instances'
  this.bindingTableName = 'bindings'

  var retryOperations = new azure.ExponentialRetryPolicyFilter();
  this.tableService = azure.createTableService(this.opts.azureStorageAccount,
    this.opts.azureStorageAccessKey).withFilter(retryOperations);
  this.tableService.createTableIfNotExists(this.instanceTableName, function(
    error, result, response) {
    if (!error) {}
  });
  this.tableService.createTableIfNotExists(this.bindingTableName, function(
    error, result, response) {
    if (!error) {}
  });

  return this;
};

/**
 * Store the service instance ID and broker reply
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker implementor reply
 * @callback {Function} next - (err)
 */
Database.prototype.storeInstance = function(req, reply, next) {
  var db = this;

  var instanceId = req.params.id;
  var serviceId = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var lastOperation = {
    operation: 'provision',
    state: 'in progress',
  }
  var entity = {
    PartitionKey: entGen.String(serviceId),
    RowKey: entGen.String(instanceId),
    PlanId: entGen.String(req.params.plan_id),
    OrganizationGuid: entGen.String(req.params.organization_guid),
    SpaceGuid: entGen.String(req.params.space_guid),
    Parameters: entGen.String(JSON.stringify(req.params.parameters)),
    LastOperation: entGen.String(JSON.stringify(lastOperation)),
  };
  db.tableService.insertEntity(db.instanceTableName, entity, function(error,
    result, response) {
    if (!error) {}
  });
};

/**
 * Deletes the service instance and associated objects
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker implementor reply
 * @callback {Function} next - (err)
 */
Database.prototype.deleteInstance = function(req, reply, next) {
  var db = this;

  var instanceId = req.params.id;
  var serviceId = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var lastOperation = {
    operation: 'deprovision',
    state: 'in progress',
  }
  var entity = {
    PartitionKey: entGen.String(serviceId),
    RowKey: entGen.String(instanceId),
    PlanId: entGen.String(req.params.plan_id),
    OrganizationGuid: entGen.String(req.params.organization_guid),
    SpaceGuid: entGen.String(req.params.space_guid),
    Parameters: entGen.String(JSON.stringify(req.params.parameters)),
    LastOperation: entGen.String(JSON.stringify(lastOperation)),
  };
  db.tableService.insertOrReplaceEntity(db.instanceTableName, entity,
    function(error,
      result, response) {
      if (!error) {}
    });
};

/**
 * Update the state of service instance or delete it
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker i mplementor reply
 * @callback {Function} next - (err)
 */
Database.prototype.updateInstanceState = function(req, reply, operation, next) {
  var db = this;

  var instanceId = req.params.id;
  var serviceId = req.params.service_id;

  if (operation == 'provision') {
    var entGen = azure.TableUtilities.entityGenerator;
    var lastOperation = {
      operation: 'provision',
      state: 'succeeded',
    }
    var entity = {
      PartitionKey: entGen.String(serviceId),
      RowKey: entGen.String(instanceId),
      PlanId: entGen.String(req.params.plan_id),
      OrganizationGuid: entGen.String(req.params.organization_guid),
      SpaceGuid: entGen.String(req.params.space_guid),
      Parameters: entGen.String(JSON.stringify(req.params.parameters)),
      LastOperation: entGen.String(JSON.stringify(lastOperation)),
    };
    db.tableService.insertOrReplaceEntity(db.instanceTableName, entity,
      function(error,
        result, response) {
        if (!error) {}
      });
  } else if (operation == 'deprovision') {
    var entityDescriptor = {
      PartitionKey: {
        _: serviceId
      },
      RowKey: {
        _: instanceId
      },
    };

    db.tableService.deleteEntity(db.instanceTableName, entityDescriptor,
      function(error, response) {
        if (!error) {
          // Entity deleted
        }
      });
  }
};

/**
 * Stores the binding and broker reply/credentials with the associated
 * instance
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker implementor reply
 * @callback {Function} next - (err)
 */
Database.prototype.storeBinding = function(req, reply, next) {
  var db = this;

  var instanceId = req.params.instance_id
  var bindingId = req.params.id;
  var serviceId = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var entity = {
    PartitionKey: entGen.String(instanceId),
    RowKey: entGen.String(bindingId),
    ServiceId: entGen.String(serviceId),
  };
  db.tableService.insertEntity(db.bindingTableName, entity, function(
    error,
    result, response) {
    if (!error) {}
  });
};

/**
 * Deletes a binding against a provisioned service instance.
 *
 * @param {String} instanceId - the service instance ID
 * @param {String} bindingId - the binding ID
 * @callback {Function} next - (err)
 */
Database.prototype.deleteBinding = function(req, reply, next) {
  var db = this;

  var instanceId = req.params.instance_id
  var bindingId = req.params.id;
  var serviceId = req.params.service_id;

  var entityDescriptor = {
    PartitionKey: {
      _: instanceId
    },
    RowKey: {
      _: bindingId
    },
  };

  db.tableService.deleteEntity(db.bindingTableName, entityDescriptor,
    function(error, response) {
      if (!error) {
        // Entity deleted
      }
    });
};

/**
 * Get the service ID by the service instance ID
 *
 * @param {String} instanceId - the service instance ID
 * @callback {Function} next - (err)
 */
Database.prototype.getServiceId = function(instanceId, next) {
  var db = this;

  var query = new azure.TableQuery()
    .top(1)
    .where('RowKey eq ?', instanceId);

  db.tableService.queryEntities(db.instanceTableName, query, null,
    function(
      error, result, response) {
      if (!error) {
        next(null, result.entries[0].PartitionKey['_']);
      } else {
        next(null, '');
      }
    });
};

/**
 * Get the service instance by the service instance ID
 *
 * @param {String} instanceId - the service instance ID
 * @callback {Function} next - (err)
 */
Database.prototype.getServiceInstance = function(instanceId, next) {
  var db = this;

  var query = new azure.TableQuery()
    .top(1)
    .where('RowKey eq ?', instanceId);

  db.tableService.queryEntities(db.instanceTableName, query, null,
    function(error, result, response) {
      if (!error) {
        var serviceId = result.entries[0].PartitionKey['_'];
        var planId = result.entries[0].PlanId['_'];
        var organizationGuid = result.entries[0].OrganizationGuid['_'];
        var spaceGuid = result.entries[0].SpaceGuid['_'];
        var parameters = JSON.parse(result.entries[0].Parameters['_']);
        var lastOperation = JSON.parse(result.entries[0].LastOperation['_']);
        var serviceInstance = {
          service_id: serviceId,
          plan_id: planId,
          organization_guid: organizationGuid,
          space_guid: spaceGuid,
          parameters: parameters,
          last_operation: lastOperation,
        };
        next(null, serviceInstance);
      } else {
        next(null, {});
      }
    });
};

/**
 * DB API - provision
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.provision = function(req, reply, next) {
  this.storeInstance(req, reply, next);
};

/**
 * DB API - deprovision
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.deprovision = function(req, reply, next) {
  this.deleteInstance(req, reply, next);
};

/**
 * DB API - bind
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.bind = function(req, reply, next) {
  this.storeBinding(req, reply, next);
};

/**
 * DB API - unbind
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.unbind = function(req, reply, next) {
  this.deleteBinding(req, reply, next);
};

module.exports = Database;