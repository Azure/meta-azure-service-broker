'use strict';

var util = require('util');
var sqlDb = require('./sqlserver');

var Database = function(opts) {
  this.opts = opts || {};
  this.dbConfig = opts.config;
  this.instanceTableName = 'instances'
  this.bindingTableName = 'bindings'

  return this;
};

Database.prototype.storeInstance = function(req, result, next) {
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
    this.instanceTableName, instanceId, serviceId, planId, organizationGuid,
    spaceGuid, parameters, lastOperation, provisioningResult);
  console.log(sql);
  sqlDb.executeSql(this.dbConfig, sql, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log('insert successful');
    }
  });
};

Database.prototype.deleteInstance = function(req, result, next) {
  var instanceId = req.params.instance_id;

  var lastOperation = 'deprovision';
  var sql = util.format(
    'UPDATE %s SET lastOperation=\'%s\' where instanceId=\'%s\'', this.instanceTableName,
    lastOperation, instanceId);
  console.log(sql);

  sqlDb.executeSql(this.dbConfig, sql, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log('deprovision successful');
    }
  });
};

Database.prototype.updateInstance = function(req, result, next) {
  var db = this;
  var instanceId = req.params.instance_id;

  db.getServiceInstance(instanceId, function(err, serviceInstance) {
    var lastOperation = serviceInstance.last_operation;
    var provisioningResult = JSON.stringify(result);
    var sql = '';
    if (lastOperation == 'provision') {
      sql = util.format(
        'UPDATE %s SET provisioningResult=\'%s\' where instanceId=\'%s\'',
        db.instanceTableName, provisioningResult, instanceId);
    } else if (lastOperation == 'deprovision') {
      sql = util.format('DELETE FROM %s where instanceId=\'%s\'', db.instanceTableName,
        instanceId);
    }
    console.log(sql);
    sqlDb.executeSql(db.dbConfig, sql, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log('update successful');
      }
    });
  });
};

Database.prototype.storeBinding = function(req, result, next) {
  var db = this;

  var instanceId = req.params.instance_id
  var bindingId = req.params.binding_id;
  var serviceId = req.params.service_id;
  var planId = req.params.plan_id;
  var parameters = JSON.stringify(req.params.parameters || {});
  var bindingResult = JSON.stringify(result);

  var sql = util.format(
    'INSERT INTO %s(bindingId, instanceId, serviceId, planId, parameters, bindingResult) values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\')',
    db.bindingTableName, bindingId, instanceId, serviceId, planId,
    parameters, bindingResult);
  console.log(sql);
  sqlDb.executeSql(this.dbConfig, sql, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log('bind successful');
    }
  });
};

Database.prototype.deleteBinding = function(req, result, next) {
  var db = this;

  var bindingId = req.params.binding_id;
  var sql = util.format(
    'DELETE FROM %s where bindingId=\'%s\'', db.bindingTableName,
    bindingId);
  console.log(sql);

  sqlDb.executeSql(this.dbConfig, sql, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log('unbind successful');
    }
  });
};

Database.prototype.getServiceInstance = function(instanceId, next) {
  var sql = util.format('SELECT * FROM %s where instanceId=\'%s\'', this.instanceTableName,
    instanceId);
  console.log(sql);

  sqlDb.executeSql(this.dbConfig, sql, function(err, result) {
    if (err) {
      console.log(err);
      next(error);
    } else {
      console.log('getting service instances successful');
      var serviceId = result[0].serviceId;
      var planId = result[0].planId;
      var organizationGuid = result[0].organizationGuid;
      var spaceGuid = result[0].spaceGuid;
      var parameters = JSON.parse(result[0].parameters);
      var lastOperation = result[0].lastOperation;
      var provisioningResult = result[0].provisioningResult;
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
    }
  });
};

Database.prototype.getServiceBinding = function(bindingId, next) {
  var sql = util.format('SELECT * FROM %s where bindingId=\'%s\'', this.bindingTableName,
    bindingId);
  console.log(sql);

  sqlDb.executeSql(this.dbConfig, sql, function(err, result) {
    if (err) {
      console.log(err);
      next(error);
    } else {
      var instanceId = result[0].instanceId;
      var serviceId = result[0].serviceId;
      var planId = result[0].planId;
      var parameters = JSON.parse(result[0].parameters);
      var bindingResult = result[0].bindingResult;
      var serviceBinding = {
        binding_id: bindingId,
        instance_id: instanceId,
        service_id: serviceId,
        plan_id: planId,
        parameters: parameters,
        binding_result: bindingResult,
      };
      next(null, serviceBinding);
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
