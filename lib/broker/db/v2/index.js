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

Database.prototype.storeInstance = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id;
  var serviceId = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var lastOperation = 'provision';
  var entity = {
    PartitionKey: entGen.String(serviceId),
    RowKey: entGen.String(instanceId),
    PlanId: entGen.String(req.params.plan_id),
    OrganizationGuid: entGen.String(req.params.organization_guid),
    SpaceGuid: entGen.String(req.params.space_guid),
    Parameters: entGen.String(JSON.stringify(req.params.parameters || {})),
    LastOperation: entGen.String(lastOperation),
    ProvisioningResult: entGen.String(JSON.stringify(result)),
  };
  db.tableService.insertEntity(db.instanceTableName, entity, function(error,
    result, response) {
    if (!error) {}
  });
};

Database.prototype.deleteInstance = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id;
  var serviceId = req.params.service_id;

  db.getServiceInstance(instanceId, function(err, serviceInstance) {
    var lastOperation = 'deprovision';
    var entGen = azure.TableUtilities.entityGenerator;
    var entity = {
      PartitionKey: entGen.String(serviceInstance.service_id),
      RowKey: entGen.String(serviceInstance.instance_id),
      PlanId: entGen.String(serviceInstance.plan_id),
      OrganizationGuid: entGen.String(serviceInstance.organization_guid),
      SpaceGuid: entGen.String(serviceInstance.space_guid),
      Parameters: entGen.String(JSON.stringify(serviceInstance.parameters)),
      LastOperation: entGen.String(lastOperation),
      ProvisioningResult: entGen.String(JSON.stringify(result)),
    };
    db.tableService.insertOrReplaceEntity(db.instanceTableName, entity,
      function(error,
        result, response) {
        if (!error) {}
      });
  });
};

Database.prototype.updateInstance = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id;

  db.getServiceInstance(instanceId, function(err, serviceInstance) {
    var lastOperation = serviceInstance.last_operation;
    if (lastOperation == 'provision') {
      var entGen = azure.TableUtilities.entityGenerator;
      var entity = {
        PartitionKey: entGen.String(serviceInstance.service_id),
        RowKey: entGen.String(serviceInstance.instance_id),
        PlanId: entGen.String(serviceInstance.plan_id),
        OrganizationGuid: entGen.String(serviceInstance.organization_guid),
        SpaceGuid: entGen.String(serviceInstance.space_guid),
        Parameters: entGen.String(JSON.stringify(serviceInstance.parameters)),
        LastOperation: entGen.String(serviceInstance.last_operation),
        ProvisioningResult: entGen.String(JSON.stringify(result)),
      };
      db.tableService.insertOrReplaceEntity(db.instanceTableName, entity,
        function(error,
          result, response) {
          if (!error) {}
        });
    } else if (lastOperation == 'deprovision') {
      var entityDescriptor = {
        PartitionKey: {
          _: serviceInstance.service_id
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
  });
};

Database.prototype.storeBinding = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id
  var bindingId = req.params.binding_id;
  var serviceId = req.params.service_id;
  var planId = req.params.plan_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var entity = {
    PartitionKey: entGen.String(instanceId),
    RowKey: entGen.String(bindingId),
    ServiceId: entGen.String(serviceId),
    PlanId: entGen.String(planId),
    BindingResult: entGen.String(JSON.stringify(result)),
  };
  db.tableService.insertEntity(db.bindingTableName, entity, function(
    error,
    result, response) {
    if (!error) {}
  });
};

Database.prototype.deleteBinding = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id
  var bindingId = req.params.binding_id;

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
        var lastOperation = result.entries[0].LastOperation['_'];
        var provisioningResult = result.entries[0].ProvisioningResult['_'];
        var serviceInstance = {
          instance_id: instanceId,
          service_id: serviceId,
          plan_id: planId,
          organization_guid: organizationGuid,
          space_guid: spaceGuid,
          parameters: parameters,
          last_operation: lastOperation,
          provisioning_result: provisioningResult,
        };
        next(null, serviceInstance);
      } else {
        next(error);
      }
    });
};

Database.prototype.getServiceBinding = function(bindingId, next) {
  var db = this;

  var query = new azure.TableQuery()
    .top(1)
    .where('RowKey eq ?', bindingId);

  db.tableService.queryEntities(db.bindingTableName, query, null,
    function(error, result, response) {
      if (!error) {
        var instanceId = result.entries[0].PartitionKey['_'];
        var serviceId = result.entries[0].ServiceId['_'];
        var planId = result.entries[0].PlanId['_'];
        var bindingResult = result.entries[0].BindingResult['_'];
        var serviceBinding = {
          instance_id: instanceId,
          binding_id: bindingId,
          service_id: serviceId,
          plan_id: planId,
          binding_result: bindingResult,
        };
        next(null, serviceBinding);
      } else {
        next(error);
      }
    });
};

Database.prototype.provision = function(req, result, next) {
  this.storeInstance(req, result, next);
};

Database.prototype.deprovision = function(req, result, next) {
  this.deleteInstance(req, result, next);
};

Database.prototype.bind = function(req, result, next) {
  this.storeBinding(req, result, next);
};

Database.prototype.unbind = function(req, result, next) {
  this.deleteBinding(req, result, next);
};

module.exports = Database;