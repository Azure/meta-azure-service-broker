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

  var instanceID = req.params.id;
  var serviceID = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var entity = {
    PartitionKey: entGen.String(serviceID),
    RowKey: entGen.String(instanceID),
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

  var instanceID = req.params.id;
  var serviceID = req.params.service_id;

  var entityDescriptor = {
    PartitionKey: {
      _: serviceID
    },
    RowKey: {
      _: instanceID
    },
  };

  db.tableService.deleteEntity(db.instanceTableName, entityDescriptor,
    function(error, response) {
      if (!error) {
        // Entity deleted
      }
    });
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

  var instanceID = req.params.instance_id
  var bindingID = req.params.id;
  var serviceID = req.params.service_id;

  var entGen = azure.TableUtilities.entityGenerator;
  var entity = {
    PartitionKey: entGen.String(instanceID),
    RowKey: entGen.String(bindingID),
    ServiceID: entGen.String(serviceID),
  };
  db.tableService.insertEntity(db.bindingTableName, entity, function(error,
    result, response) {
    if (!error) {}
  });
};

/**
 * Deletes a binding against a provisioned service instance.
 *
 * @param {String} instanceID - the service instance ID
 * @param {String} bindingID - the binding ID
 * @callback {Function} next - (err)
 */
Database.prototype.deleteBinding = function(req, reply, next) {
  var db = this;

  var instanceID = req.params.instance_id
  var bindingID = req.params.id;
  var serviceID = req.params.service_id;

  var entityDescriptor = {
    PartitionKey: {
      _: instanceID
    },
    RowKey: {
      _: bindingID
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
 * Get the service ID by  the service instance ID
 *
 * @param {String} instanceID - the service instance ID
 * @callback {Function} next - (err)
 */
Database.prototype.getServiceID = function(instanceID, next) {
  var db = this;

  var query = new azure.TableQuery()
    .top(1)
    .where('RowKey eq ?', instanceID);

  db.tableService.queryEntities(db.instanceTableName, query, null, function(
    error, result, response) {
    if (!error) {
      next(null, result.entries[0].PartitionKey['_']);
    } else {
      next(null, '');
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