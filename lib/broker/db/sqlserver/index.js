/*jshint camelcase: false */

'use strict';

var _ = require('underscore');
var util = require('util');
var common = require('../../../common');
var sqlserver = require('./sqlserver');
var HttpStatus = require('http-status-codes');
var fs = require('fs');
var encryptionHelper = require('../../../common/encryptionhelper.js');
var log = common.getLogger(common.LOG_CONSTANTS.BROKER_DB);

var Database = function(opts) {
  this.dbConfig = opts || {};
  this.dbConfig.options = {
    'encrypt': true
  };
  this.name = 'sqlserver';
  this.encryptionKey = opts.encryptionKey;

  return this;
};

Database.prototype.createSchema = function(callback) {
  var db = this;

  log.info('Loading schema');
  fs.readFile('./lib/broker/db/sqlserver/schema.sql', 'utf8', function (err, data) {
    if (err) {
      log.error('Failed to read the schema: %j', err);
      callback(err);
    }
    sqlserver.executeSql(db.dbConfig, data, function(err, data) {
      if (err) {
        log.error('Failed to execute sql: %j', err);
        callback(err);
      } else {
        callback(null);
      }
    });
  });
};

Database.prototype.createServiceInstance = function(params, callback) {
  var db = this;

  var azureInstanceId = params.azureInstanceId;
  var instanceId = params.instance_id;
  var serviceId = params.service_id;
  var planId = params.plan_id;
  var organizationGuid = params.organization_guid;
  var spaceGuid = params.space_guid;
  var parameters = JSON.stringify(params.parameters || {});

  parameters = encryptionHelper.encryptText(db.encryptionKey, params.instance_id, parameters);

  var sql = util.format(
    'INSERT INTO %s(azureInstanceId, status, instanceId, serviceId, planId, organizationGuid, spaceGuid, parameters, lastOperation) values (\'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', \'%s\', @parameters, \'%s\')',
    db.instanceTableName,
    azureInstanceId, 'pending', instanceId, serviceId, planId,
    organizationGuid, spaceGuid, 'provision');
  log.debug(sql);

  sqlserver.executeSqlWithParameters(db.dbConfig, sql, parameters, function(err, data) {
    if (err) {
      if (err.name == 'RequestError' && err.message.startsWith('Violation of UNIQUE KEY constraint')) {
        return common.handleServiceErrorEx(HttpStatus.CONFLICT,
          util.format('Failed in inserting the record for (instanceId: %s) into the broker database. It is caused by that a record with the same azureInstanceId exists. DB Error: %j', instanceId, err),
          callback);
      }
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in inserting the record for (instanceId: %s) into the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    log.info('The information of the serivce instance (instanceId=%s) is created.', instanceId);
    callback(null);
  });
};

Database.prototype.updateServiceInstanceLastOperation = function(instanceId, lastOperation, callback) {
  var params = util.format('lastOperation=\'%s\'', lastOperation);
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstanceProvisioningPendingResult = function(instanceId, provisioningResult, callback) {
  provisioningResult = encryptionHelper.encryptText(this.encryptionKey, instanceId, provisioningResult);
  var params = util.format('provisioningResult=\'%s\'', provisioningResult);
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstanceProvisioningSuccessResult = function(instanceId, provisioningResult, callback) {
  provisioningResult = encryptionHelper.encryptText(this.encryptionKey, instanceId, provisioningResult);
  var params = util.format('provisioningResult=\'%s\', status=\'success\'', provisioningResult);
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstance = function(instanceId, params, callback) {
  var db = this;

  var sql = util.format(
    'UPDATE %s SET %s, timestamp=getdate() where instanceId=\'%s\'',
    db.instanceTableName, params, instanceId);
  log.debug(sql);
  sqlserver.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in updating the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    log.info('Updated the serivce instance information (instanceId=%s).', instanceId);
    callback(null);
  });
};

Database.prototype.getServiceInstance = function(instanceId, callback) {
  var db = this;

  var sql = util.format('SELECT * FROM %s where instanceId=\'%s\'', db.instanceTableName, instanceId);
  log.debug(sql);

  sqlserver.executeSql(db.dbConfig, sql, function(err, result) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in finding the record by (instanceId: %s) in the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    if (result.length === 0) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('The information of the service instance (instanceId=%s) does not exist.', instanceId),
        callback);
    }

    var parameters = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, instanceId, result[0].parameters));
    var provisioningResult = result[0].provisioningResult;
    if (!(_.isNull(provisioningResult) || _.isUndefined(provisioningResult))) {
      provisioningResult = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, instanceId, provisioningResult));
    }

    var serviceInstance = {};
    serviceInstance = {
      azureInstanceId: result[0].azureInstanceId,
      status: result[0].status,
      timestamp: result[0].timestamp,
      instance_id: instanceId,
      service_id: result[0].serviceId,
      plan_id: result[0].planId,
      organization_guid: result[0].organizationGuid,
      space_guid: result[0].spaceGuid,
      parameters: parameters,
      last_operation: result[0].lastOperation,
      provisioning_result: provisioningResult,
    };
    log.info('Got the information of the service instance (instanceId=%s)', instanceId);
    callback(null, serviceInstance);
  });
};

Database.prototype.setServiceInstance = function (serviceInstance, callback) {
  var db = this;
  var instanceId = serviceInstance.instance_id;

  // Encrypt configuration settings that may contain credentials
  var parameters = JSON.stringify(serviceInstance.parameters || {});
  var provisioningResult = JSON.stringify(serviceInstance.provisioning_result);
  parameters = encryptionHelper.encryptText(db.encryptionKey, instanceId, parameters);
  provisioningResult = encryptionHelper.encryptText(db.encryptionKey, instanceId, provisioningResult);

  var sql = util.format(
    'UPDATE %s SET status=\'%s\', planId=\'%s\', parameters=\'%s\', lastOperation=\'%s\', provisioningResult=\'%s\', timestamp=getdate() where instanceId=\'%s\'',
    db.instanceTableName,
    serviceInstance.status,
    serviceInstance.plan_id,
    parameters,
    serviceInstance.last_operation,
    provisioningResult,
    instanceId);
  log.debug(sql);
  sqlserver.executeSql(db.dbConfig, sql, function (err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in updating the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    log.info('Updated the serivce instance information (instanceId=%s).', instanceId);
    callback(null);
  });
};

Database.prototype.deleteServiceInstance = function(instanceId, callback) {
  var db = this;

  var sql = util.format('DELETE FROM %s where instanceId=\'%s\'', db.instanceTableName, instanceId);
  log.debug(sql);
  sqlserver.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in deleting the record for (instanceId: %s) from the broker database. You may need to delete this record manually. DB Error: %j.', instanceId, err),
        callback);
    }

    log.info('Deleted the serivce instance information (instanceId=%s).', instanceId);
    callback(null);
  });
};

Database.prototype.createServiceBinding = function(params, result, callback) {
  var db = this;

  var instanceId = params.instance_id;
  var bindingId = params.binding_id;
  var serviceId = params.service_id;
  var planId = params.plan_id;
  var parameters = JSON.stringify(params.parameters || {});
  var bindingResult = JSON.stringify(result);

  parameters = encryptionHelper.encryptText(db.encryptionKey, bindingId, parameters);
  bindingResult = encryptionHelper.encryptText(db.encryptionKey, bindingId, bindingResult);

  var sql = util.format(
    'INSERT INTO %s(bindingId, instanceId, serviceId, planId, parameters, bindingResult) values (\'%s\', \'%s\', \'%s\', \'%s\', @parameters, \'%s\')',
    db.bindingTableName, bindingId, instanceId, serviceId, planId, bindingResult);
  log.debug(sql);
  sqlserver.executeSqlWithParameters(db.dbConfig, sql, parameters, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in inserting the record (bindingId: %s) for(instanceId: %s) in broker database. DB Error: %j', bindingId, instanceId, err),
        callback);
    }

    log.info('The information of the serivce binding (bindingId=%s, instanceId=%s) is created.', bindingId, instanceId);
    callback(null);
  });
};

Database.prototype.getServiceBinding = function(bindingId, callback) {
  var db = this;

  var sql = util.format('SELECT * FROM %s where bindingId=\'%s\'', db.bindingTableName, bindingId);
  log.debug(sql);

  sqlserver.executeSql(db.dbConfig, sql, function(err, result) {
    if (err) {
      return common.handleServiceErrorEx(
        HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in finding the record by (bindingId: %s) in broker database. DB Error: %j', bindingId, err),
        callback);
    }

    if (result.length === 0) {
      return common.handleServiceErrorEx(
        HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('The information of the serivce binding (bindingId=%s) is deleted.', bindingId),
        callback);
    }

    var parameters = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, bindingId, result[0].parameters));
    var bindingResult = result[0].bindingResult;
    if (!(_.isNull(bindingResult) || _.isUndefined(bindingResult))) {
      bindingResult = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, bindingId, bindingResult));
    }

    var serviceBinding = {};
    serviceBinding = {
      binding_id: bindingId,
      instance_id: result[0].instanceId,
      timestamp: result[0].timestamp,
      service_id: result[0].serviceId,
      plan_id: result[0].planId,
      parameters: parameters,
      binding_result: bindingResult,
    };
    log.info('Got the information of the serivce binding (bindingId=%s).', bindingId);
    callback(null, serviceBinding);
  });
};

Database.prototype.deleteServiceBinding = function(instanceId, bindingId, callback) {
  var db = this;

  var sql = util.format('DELETE FROM %s where bindingId=\'%s\'', db.bindingTableName, bindingId);
  log.debug(sql);

  sqlserver.executeSql(db.dbConfig, sql, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in deleting the record (bindingId: %s) for(instanceId: %s) in the broker database. DB Error: %j', bindingId, instanceId, err),
        callback);
    }

    log.info('The information of the serivce binding (bindingId=%s) is deleted.', bindingId);
    callback(null);
  });
};

module.exports = Database;
