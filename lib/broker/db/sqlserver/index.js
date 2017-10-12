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
var path = require('path');

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
  var schemaPath = path.join(__dirname, 'schema.sql');
  log.info('Loading schema');

  fs.readFile(schemaPath, 'utf8', function (err, data) {
    if (err) {
      log.error('Failed to read the schema: %j', err);
      callback(err);
    }
    sqlserver.executeSql(db.dbConfig, data, {}, function(err, data) {
      if (err) {
        log.error('Failed to execute sql: %j', err);
        callback(err);
      } else {
        callback(null);
      }
    });
  });
};

Database.prototype.updateSQLPassword = function(instance, newPassword, callback) {
  log.info('Updating sql password: %s', instance.azureInstanceId);

  if (instance.parameters.sqlServerParameters && instance.parameters.sqlServerParameters.properties){
    instance.parameters.sqlServerParameters.properties.administratorLoginPassword = newPassword;
  }

  if (instance['provisioning_result']){
    instance['provisioning_result'].administratorLoginPassword = newPassword;
  }

  return this.setServiceInstance(instance, callback);
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
    'INSERT INTO %s (azureInstanceId, status, instanceId, serviceId, planId, organizationGuid, spaceGuid, parameters, lastOperation) ' +
      'values (@azureInstanceId, @status, @instanceId, @serviceId, @planId, @organizationGuid, @spaceGuid, @parameters, @lastOperation)',
    db.instanceTableName
  );
    
  var sqlParameters = {
    'azureInstanceId': azureInstanceId,
    'status': 'pending',
    'instanceId': instanceId,
    'serviceId': serviceId,
    'planId': planId,
    'organizationGuid': organizationGuid,
    'spaceGuid': spaceGuid,
    'parameters': parameters,
    'lastOperation': 'provision'
  };
  log.debug(sql, sqlParameters);

  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, data) {
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

    log.info('The information of the service instance (instanceId=%s) is created.', instanceId);
    callback(null);
  });
};

Database.prototype.updateServiceInstanceDeprovisioningResult = function(instanceId, lastOperation, provisioningResult, callback) {
  provisioningResult = encryptionHelper.encryptText(this.encryptionKey, instanceId, provisioningResult);
  var params = {
    'lastOperation': lastOperation,
    'provisioningResult': provisioningResult
  };
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstanceProvisioningPendingResult = function(instanceId, provisioningResult, callback) {
  provisioningResult = encryptionHelper.encryptText(this.encryptionKey, instanceId, provisioningResult);
  var params = {
    'provisioningResult': provisioningResult
  };
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstanceProvisioningSuccessResult = function(instanceId, provisioningResult, callback) {
  provisioningResult = encryptionHelper.encryptText(this.encryptionKey, instanceId, provisioningResult);
  var params = {
    'provisioningResult': provisioningResult,
    'status': 'success'
  };
  this.updateServiceInstance(instanceId, params, callback);
};

Database.prototype.updateServiceInstance = function(instanceId, params, callback) {
  var db = this;

  var attrsToUpdate = '';
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      attrsToUpdate += util.format('%s=@%s, ', key, key);
    }
  }
  var sql = util.format(
    'UPDATE %s SET %stimestamp=getdate() where instanceId=@instanceId',
    db.instanceTableName,
    attrsToUpdate
  );
  var sqlParameters = {};
  sqlParameters = _.extend(sqlParameters, params);
  sqlParameters = _.extend(sqlParameters, {'instanceId': instanceId});

  log.debug(sql, sqlParameters);
  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in updating the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    log.info('Updated the service instance information (instanceId=%s).', instanceId);
    callback(null);
  });
};

// Get an array of all service instances. Uses a single SQL query.
Database.prototype.getServiceInstances = function(callback) {
  var db = this;

  var sql = util.format(
    'SELECT * FROM %s',
    db.instanceTableName
  );
  var sqlParameters = {
  };
  log.debug(sql, sqlParameters);
  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function (err, result) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed getting instances in the broker database. DB Error: %j', err), callback);
    }

    if (result.length === 0) {
      return callback(null, []);
    }

    var instances = _.map(result, db.deserializeRecord, db);
    return callback(null, instances);
  });
};

// Convert an SQL record to JSON representation. Also decrypts the provisioning parameters and results.
Database.prototype.deserializeRecord = function(record) {
  var db = this;
  var instanceId = record.instanceId;

  var parameters = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, instanceId, record.parameters));
  var provisioningResult = record.provisioningResult;
  if (!(_.isNull(provisioningResult) || _.isUndefined(provisioningResult))) {
    provisioningResult = JSON.parse(encryptionHelper.decryptText(db.encryptionKey, instanceId, provisioningResult));
  }
  var state = JSON.parse(record.state || '{}');

  var serviceInstance = {};
  serviceInstance = {
    azureInstanceId: record.azureInstanceId,
    status: record.status,
    timestamp: record.timestamp,
    instance_id: instanceId,
    service_id: record.serviceId,
    plan_id: record.planId,
    organization_guid: record.organizationGuid,
    space_guid: record.spaceGuid,
    parameters: parameters,
    last_operation: record.lastOperation,
    provisioning_result: provisioningResult,
    state: state,
  };
  log.debug('Deserialized service instance (%s)', record.azureInstanceId);
  return serviceInstance;
};


Database.prototype.getServiceInstance = function(instanceId, callback) {
  var db = this;

  var sql = util.format(
    'SELECT * FROM %s where instanceId=@instanceId',
    db.instanceTableName
  );
  var sqlParameters = {
    'instanceId': instanceId
  };
  log.debug(sql, sqlParameters);

  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, result) {
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

    var serviceInstance = db.deserializeRecord(result[0]);
    callback(null, serviceInstance);
  });
};

Database.prototype.setServiceInstance = function (serviceInstance, callback) {
  var db = this;
  var instanceId = serviceInstance.instance_id;

  // Encrypt configuration settings that may contain credentials
  var parameters = JSON.stringify(serviceInstance.parameters || {});
  var provisioningResult = JSON.stringify(serviceInstance.provisioning_result);
  var state = JSON.stringify(serviceInstance.state);
  parameters = encryptionHelper.encryptText(db.encryptionKey, instanceId, parameters);
  provisioningResult = encryptionHelper.encryptText(db.encryptionKey, instanceId, provisioningResult);

  var sql = util.format(
    'UPDATE %s SET' + 
      ' status=@status,' +
      ' planId=@planId,' + 
      ' parameters=@parameters,' + 
      ' lastOperation=@lastOperation,' +
      ' provisioningResult=@provisioningResult,' +
      ' state=@state,' +
      ' timestamp=getdate()' +
      ' where instanceId=@instanceId',
    db.instanceTableName
  );
  var sqlParameters = {
    'status': serviceInstance.status,
    'planId': serviceInstance.plan_id,
    'parameters': parameters,
    'lastOperation': serviceInstance.last_operation,
    'provisioningResult': provisioningResult,
    'state': state,
    'instanceId': instanceId
  };
  log.debug(sql, sqlParameters);
  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function (err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in updating the record for (instanceId: %s) in the broker database. DB Error: %j', instanceId, err),
        callback);
    }

    log.info('Updated the service instance information (instanceId=%s).', instanceId);
    callback(null);
  });
};

Database.prototype.deleteServiceInstance = function(instanceId, callback) {
  var db = this;

  var sql = util.format(
    'DELETE FROM %s where instanceId=@instanceId',
    db.instanceTableName
  );
  var sqlParameters = {
    'instanceId': instanceId
  };
  log.debug(sql, sqlParameters);
  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in deleting the record for (instanceId: %s) from the broker database. You may need to delete this record manually. DB Error: %j.', instanceId, err),
        callback);
    }

    log.info('Deleted the service instance information (instanceId=%s).', instanceId);
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
    'INSERT INTO %s (bindingId, instanceId, serviceId, planId, parameters, bindingResult) ' +
      'values (@bindingId, @instanceId, @serviceId, @planId, @parameters, @bindingResult)',
    db.bindingTableName
  );
  var sqlParameters = {
    'bindingId': bindingId,
    'instanceId': instanceId,
    'serviceId': serviceId,
    'planId': planId,
    'parameters': parameters,
    'bindingResult': bindingResult
  };
  log.debug(sql, sqlParameters);
  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in inserting the record (bindingId: %s) for(instanceId: %s) in broker database. DB Error: %j', bindingId, instanceId, err),
        callback);
    }

    log.info('The information of the service binding (bindingId=%s, instanceId=%s) is created.', bindingId, instanceId);
    callback(null);
  });
};

Database.prototype.getServiceBinding = function(bindingId, callback) {
  var db = this;

  var sql = util.format(
    'SELECT * FROM %s where bindingId=@bindingId',
    db.bindingTableName
  );
  var sqlParameters = {
    'bindingId': bindingId
  };
  log.debug(sql, sqlParameters);

  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, result) {
    if (err) {
      return common.handleServiceErrorEx(
        HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in finding the record by (bindingId: %s) in broker database. DB Error: %j', bindingId, err),
        callback);
    }

    if (result.length === 0) {
      return common.handleServiceErrorEx(
        HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('The information of the service binding (bindingId=%s) is deleted.', bindingId),
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
    log.info('Got the information of the service binding (bindingId=%s).', bindingId);
    callback(null, serviceBinding);
  });
};

Database.prototype.deleteServiceBinding = function(instanceId, bindingId, callback) {
  var db = this;

  var sql = util.format(
    'DELETE FROM %s where bindingId=@bindingId',
    db.bindingTableName
  );
  var sqlParameters = {
    'bindingId': bindingId
  };
  log.debug(sql, sqlParameters);

  sqlserver.executeSql(db.dbConfig, sql, sqlParameters, function(err, data) {
    if (err) {
      return common.handleServiceErrorEx(HttpStatus.INTERNAL_SERVER_ERROR,
        util.format('Failed in deleting the record (bindingId: %s) for(instanceId: %s) in the broker database. DB Error: %j', bindingId, instanceId, err),
        callback);
    }

    log.info('The information of the service binding (bindingId=%s) is deleted.', bindingId);
    callback(null);
  });
};

module.exports = Database;
