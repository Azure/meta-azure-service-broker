/*jshint camelcase: false */

'use strict';

var util = require('util');
var Logule = require('logule');
var sqlDb = require('./sqlserver');

var Database = function(opts) {
  this.opts = opts || {};
  this.dbConfig = opts.config;
  this.instanceTableName = 'instances';
  this.bindingTableName = 'bindings';

  this.log = Logule.init(module, this.opts.type);

  return this;
};

Database.prototype.provisionServiceInstance = function(req, result, callback) {
  var db = this;

  var instanceId = req.params.instance_id;
  var serviceId = req.params.service_id;
  var planId = req.params.plan_id;
  var organizationGuid = req.params.organization_guid;
  var spaceGuid = req.params.space_guid;
  var parameters = JSON.stringify(req.params.parameters || {});
  var lastOperation = 'provision';
  var provisioningResult = JSON.stringify(result);

  var sql = util.format(
    'INSERT INTO %s(instanceId, serviceId, planId, organizationGuid, spaceGuid, parameters, lastOperation, provisioningResult) values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
    db.instanceTableName, instanceId, serviceId, planId, organizationGuid,
    spaceGuid, parameters, lastOperation, provisioningResult);
  db.log.debug(sql);
  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info(
        'The information of the serivce instance (instanceId=%s) is created.',
        instanceId);
    }
  });
};

Database.prototype.deprovisionServiceInstance = function(req, result, callback) {
  var db = this;
  var instanceId = req.params.instance_id;

  var lastOperation = 'deprovision';
  var sql = util.format(
    'UPDATE %s SET lastOperation=\'%s\' where instanceId=\'%s\'',
    db.instanceTableName, lastOperation, instanceId);
  db.log.debug(sql);

  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info('The serivce instance (instanceId=%s) is marked as deprovisioning state.', instanceId);
    }
  });
};

Database.prototype.updateServiceInstance = function(instanceId, provisioningResult) {
  var db = this;

  var sql = util.format(
    'UPDATE %s SET provisioningResult=\'%s\' where instanceId=\'%s\'',
    db.instanceTableName, provisioningResult, instanceId);
  db.log.debug(sql);
  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info('Updated the serivce instance information (instanceId=%s).', instanceId);
    }
  });
};

Database.prototype.deleteServiceInstance = function(instanceId) {
  var db = this;

  var sql = util.format('DELETE FROM %s where instanceId=\'%s\'', db.instanceTableName, instanceId);
  db.log.debug(sql);
  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info('Deleted the serivce instance information (instanceId=%s).', instanceId);
    }
  });
};

Database.prototype.storeServiceBinding = function(req, result, callback) {
  var db = this;

  var instanceId = req.params.instance_id;
  var bindingId = req.params.binding_id;
  var serviceId = req.params.service_id;
  var planId = req.params.plan_id;
  var parameters = JSON.stringify(req.params.parameters || {});
  var bindingResult = JSON.stringify(result);

  var sql = util.format(
    'INSERT INTO %s(bindingId, instanceId, serviceId, planId, parameters, bindingResult) values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
    db.bindingTableName, bindingId, instanceId, serviceId, planId, parameters, bindingResult);
  db.log.debug(sql);
  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info('The information of the serivce binding (bindingId=%s, instanceId=%s) is created.', bindingId, instanceId);
    }
  });
};

Database.prototype.deleteServiceBinding = function(req, result, callback) {
  var db = this;

  var bindingId = req.params.binding_id;
  var sql = util.format('DELETE FROM %s where bindingId=\'%s\'', db.bindingTableName, bindingId);
  db.log.debug(sql);

  sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      db.log.error(err);
    } else {
      db.log.info('The information of the serivce binding (bindingId=%s) is deleted.', bindingId);
    }
  });
};

Database.prototype.getServiceInstance = function(instanceId, callback) {
  var db = this;

  var sql = util.format('SELECT * FROM %s where instanceId=\'%s\'', db.instanceTableName, instanceId);
  db.log.debug(sql);

  sqlDb.executeSql(db.dbConfig, sql, function(err, result) {
    if (err) {
      db.log.error(err);
      callback(err);
    } else {
      var serviceInstance = {};
      if (result.length === 1) {
        serviceInstance = {
          instance_id: instanceId,
          service_id: result[0].serviceId,
          plan_id: result[0].planId,
          organization_guid: result[0].organizationGuid,
          space_guid: result[0].spaceGuid,
          parameters: JSON.parse(result[0].parameters),
          last_operation: result[0].lastOperation,
          provisioning_result: result[0].provisioningResult,
        };
        db.log.info('Got the information of the service instance (instanceId=%s)', instanceId);
      } else {
        db.log.info('The information of the service instance (instanceId=%s) does not exist.', instanceId);
      }
      callback(null, serviceInstance);
    }
  });
};

Database.prototype.getServiceBinding = function(bindingId, callback) {
  var db = this;

  var sql = util.format('SELECT * FROM %s where bindingId=\'%s\'', db.bindingTableName, bindingId);
  db.log.debug(sql);

  sqlDb.executeSql(db.dbConfig, sql, function(err, result) {
    if (err) {
      db.log.error(err);
      callback(err);
    } else {
      var serviceBinding = {};
      if (result.length === 1) {
        serviceBinding = {
          binding_id: bindingId,
          instance_id: result[0].instanceId,
          service_id: result[0].serviceId,
          plan_id: result[0].planId,
          parameters: JSON.parse(result[0].parameters),
          binding_result: result[0].bindingResult,
        };
        db.log.info('Got the information of the serivce binding (bindingId=%s).', bindingId);
      } else {
        db.log.info('The information of the serivce binding (bindingId=%s) is deleted.', bindingId);
      }
      callback(null, serviceBinding);
    }
  });
};

Database.prototype.provision = function(req, result, callback) {
  this.provisionServiceInstance(req, result, callback);
};

Database.prototype.deprovision = function(req, result, callback) {
  this.deprovisionServiceInstance(req, result, callback);
};

Database.prototype.poll = function(req, result, callback) {
  var db = this;
  var instanceId = req.params.instance_id;

  db.getServiceInstance(instanceId, function(err, serviceInstance) {
    var lastOperation = serviceInstance.last_operation;
    if (lastOperation == 'provision') {
      var provisioningResult = JSON.stringify(result);
      db.updateServiceInstance(instanceId, provisioningResult);
    } else if (lastOperation == 'deprovision') {
      db.deleteServiceInstance(instanceId);
    }
  });
};

Database.prototype.bind = function(req, result, callback) {
  this.storeServiceBinding(req, result, callback);
};

Database.prototype.unbind = function(req, result, callback) {
  this.deleteServiceBinding(req, result, callback);
};

module.exports = Database;
