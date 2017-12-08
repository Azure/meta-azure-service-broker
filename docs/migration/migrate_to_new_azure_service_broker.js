var crypto = require('crypto');
var sqlDb = require('mssql');
var yaml = require('js-yaml');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var child_process = require('child_process');
var request = require('request');
var async = require('async');

var failed_iids = [];
var failed_bids = [];

function getToken(sp_config, callback) {
  request({
    url: util.format('https://login.windows.net/%s/oauth2/token', sp_config['tenant_id']),
    qs: {'api-version' : '2015-05-01-preview'},
    method: 'POST',
    form: {'grant_type': 'client_credentials','client_id': sp_config['client_id'],'client_secret': sp_config['client_secret'],'resource': 'https://management.azure.com/','scope': 'user_impersonation'}
    }, function(error, response, body){
      if (error) {
        return callback(error);
      }
      if (response.statusCode == 200) {
        callback(null, JSON.parse(body).access_token);
      } else {
        callback(response.statusCode + ' ' + body);
      }
  });
}

function listKeys(sp_config, rg, provider, name, api_version, callback) {
  getToken(sp_config, function(err, token){
    if (err) {
      return callback(err);
    }
    var url = util.format(
      'https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/%s/%s/listKeys',
      sp_config['sub_id'],
      rg,
      provider,
      name
    );
    request({
      url: url,
      qs: {'api-version' : api_version},
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    }, function(error, response, body){
      if (error) {
        return callback(error);
      }
      if (response.statusCode == 200) {
        callback(null, JSON.parse(body));
      } else {
        callback(response.statusCode + ' ' + body);
      }
    });
  });
}

function encryptText(key, iv, text) {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var cipher = crypto.createCipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = cipher.update(text, 'utf8', encoding);
  result += cipher.final(encoding);

  return result;
};

function decryptText(key, iv, text) {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var decipher = crypto.createDecipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = decipher.update(text, encoding);
  result += decipher.final();

  return result;
};


function executeSql(config, sql, callback, retry, retryInterval) {

  if (!(typeof retry === 'number' && (retry%1) === 0)) {
    retry = 3;
  }
  if (!(typeof retryInterval === 'number' && (retryInterval%1) === 0)) {
    retryInterval = 1000;
  }
  var conn = sqlDb.connect(config, function(err) {
    if (err) {
      if (retry === 0) {
        return callback(err);
      } else {
        return setTimeout(function(){executeSql(config, sql, callback, retry-1, retryInterval);}, retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.query(sql, function(err, recordset) {
      conn.close();
      callback(err, recordset);
    });
  });
};

function getMssqlConfigurations(env) {
  var config = {
    'server': env['AZURE_BROKER_DATABASE_SERVER'],
    'user': env['AZURE_BROKER_DATABASE_USER'],
    'password': env['AZURE_BROKER_DATABASE_PASSWORD'],
    'database': env['AZURE_BROKER_DATABASE_NAME'],
    'encryptionKey': env['AZURE_BROKER_DATABASE_ENCRYPTION_KEY'],
    'options': {
      'encrypt': true
    }
  };
  return config;
};

function getRedisConfigurations(env) {
  var config = {
    'host': env['REDIS_HOST'],
    'port': env['REDIS_PORT'],
    'password': env['REDIS_PASSWORD'],
    'aes_key': env['AES256_KEY']
  };
  return config;
};

function getSpConfigurations(env) {
  var config = {
    'sub_id': env['SUBSCRIPTION_ID'],
    'tenant_id': env['TENANT_ID'],
    'client_id': env['CLIENT_ID'],
    'client_secret': env['CLIENT_SECRET']
  };
  return config;
};

function insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback){
  var goCmd = util.format(
    'go run migrate_to_new_azure_service_broker_helper_pc.go \"%s\" \"%s\" \"%s\" \"%s\" \"%s\" \"%s\" \"%s\" \"%s\"',
    instanceID,
    serviceID,
    planID,
    rg,
    pc,
    redis_config['host'] + ":" + redis_config['port'],
    redis_config['password'],
    redis_config['aes_key']
  );
  console.log('    Inserting record to redis...');
  child_process.exec(goCmd, (err, stdout, stderr) => {
    if (err) {
      console.error('    Failed to insert record to redis', err);
      return callback(err);
    }
    if (stderr) {
      console.error('    Failed to insert record to redis', stderr);
      return callback(Error(stderr));
    }
    console.log('    Succeeded.');
    callback(null);
  });
}

function insert_bc(bindingID, instanceID, bc, redis_config, callback){
  var goCmd2 = util.format(
    'go run migrate_to_new_azure_service_broker_helper_bc.go \"%s\" \"%s\" \"%s\" \"%s\" \"%s\" \"%s\" ',
    bindingID,
    instanceID,
    bc,
    redis_config['host'] + ":" + redis_config['port'],
    redis_config['password'],
    redis_config['aes_key']
  );
  console.log('      Inserting record to redis...');
  child_process.exec(goCmd2, (err, stdout, stderr) => {
    if (err) {
      console.error('      Failed to insert record to redis', err);
      return callback(err);
    }
    if (stderr) {
      console.error('      Failed to insert record to redis', stderr);
      return callback(Error(stderr));
    }
    console.log('      Succeeded.');
    callback(null);
  });
}

function migrate_azure_sqldb(mssql_config, redis_config, callback) {
  var sql = 'SELECT * FROM instances WHERE azureInstanceId like \'azure-sqldb-%\'';

  console.log('Getting records of azure-sqldb instances...');
  executeSql(mssql_config, sql, function(err, results) {
    if (err) {
      callback(err);
    }

    async.eachSeries(results, function(result, callback){
      var instanceID = result.instanceId;
      console.log('  Migrating instance with ID %s ...', instanceID);
      var serviceID = result.serviceId;
      var planID = result.planId;

      var parameters, provisioningResult;
      var failedToDecrypt = false;
      try {
        parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
        provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      } catch (e) {
        console.log(util.format('Failed to decrypt record: \n' +
                                  '  encryted parameters: %s\n' +
                                  '  encryted provisioningResult: %s\n',
                                  parameters,
                                  provisioningResult
                                ));
        failedToDecrypt = true;
      }
      if (failedToDecrypt){
        failed_iids.push(instanceID);
        return callback(null);
      }

      var rg = provisioningResult.resourceGroup ? provisioningResult.resourceGroup : parameters.resourceGroup;
      var server = provisioningResult.sqlServerName ? provisioningResult.sqlServerName : parameters.sqlServerName;
      var location = provisioningResult.location ? provisioningResult.location : parameters.location;
      var administratorLogin = provisioningResult.administratorLogin;
      var administratorLoginPassword = provisioningResult.administratorLoginPassword;
      var database = provisioningResult.name ? provisioningResult.name : parameters.sqldbName;
      var fullyQualifiedDomainName = provisioningResult.fullyQualifiedDomainName;

      if (!(instanceID && serviceID && planID && rg && server && location &&
            administratorLogin && administratorLoginPassword &&
            database && fullyQualifiedDomainName)) {
        console.log(util.format('Broken instance record: \n' +
                                  '  instanceID: %s\n' +
                                  '  serviceID: %s\n' +
                                  '  planID: %s\n' +
                                  '  resource group: %s\n' +
                                  '  server name: %s\n' +
                                  '  location: %s\n' +
                                  '  administrator login: %s\n' +
                                  '  administrator login password: %s\n' +
                                  '  database name: %s\n' +
                                  '  FQDN: %s\n',
                                  instanceID,
                                  serviceID,
                                  planID,
                                  rg,
                                  server,
                                  location,
                                  administratorLogin,
                                  administratorLoginPassword,
                                  database,
                                  fullyQualifiedDomainName
                                ));
        failed_iids.push(instanceID);
        return callback(null);
      }

      var isNewServer = (new_sql_servers.indexOf(instanceID) > -1) ? true : false;
      async.waterfall([
        function(callback){
          // https://github.com/Azure/azure-service-broker/blob/master/pkg/services/mssql/types.go
          var pc = util.format(
            '{\\\"armDeployment\\\":\\\"test\\\",' +
              '\\\"server\\\":\\\"%s\\\",' +
              '\\\"isNewServer\\\":%s,' +
              '\\\"location\\\":\\\"%s\\\",' +
              '\\\"administratorLogin\\\":\\\"%s\\\",' +
              '\\\"administratorLoginPassword\\\":\\\"%s\\\",' +
              '\\\"database\\\":\\\"%s\\\",' +
              '\\\"fullyQualifiedDomainName\\\":\\\"%s\\\"}',
            server,
            isNewServer,
            location,
            administratorLogin,
            administratorLoginPassword,
            database,
            fullyQualifiedDomainName
          );

          insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback);
        },
        function(callback){
          var sql = util.format('SELECT * FROM bindings WHERE instanceId=\'%s\'', instanceID);
          executeSql(mssql_config, sql, function(err, results) {
            if (err) {
              callback(err);
            }

            async.eachSeries(results, function(result, callback) {
              var bindingResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.bindingId, result.bindingResult));
              var bindingID = result.bindingId;
              console.log('    Migrating binding with id %s ...', bindingID);
              var databaseLogin = bindingResult.databaseLogin;

              if (!databaseLogin) {
                console.log('Broken binding record without databaseLogin.');
                failed_bids.push(bindingID);
                return callback(null);
              }
              if (!bindingID) {
                console.log('Broken binding record without bindingID.');
                failed_bids.push(bindingID);
                return callback(null);
              }

              var bc = util.format(
                '{\\\"loginName\\\":\\\"%s\\\"}',
                databaseLogin
              );

              insert_bc(bindingID, instanceID, bc, redis_config, callback);
            }, function(err){
              callback(err);
            });

          });
        }
      ], function(err){
        if (err) {
          console.log(err);
          failed_iids.push(instanceID);
        }
        callback(null);
      });
    }, function(err) {
      callback(err);
    });

  });
}

function migrate_azure_rediscache(mssql_config, redis_config, sp_config, callback) {
  var sql = 'SELECT * FROM instances WHERE azureInstanceId like \'azure-rediscache-%\'';

  console.log('Getting records of azure-rediscache instances...');
  executeSql(mssql_config, sql, function(err, results) {
    if (err) {
      callback(err);
    }

    async.eachSeries(results, function(result, callback){
      var instanceID = result.instanceId;
      console.log('  Migrating instance with ID %s ...', instanceID);
      var serviceID = result.serviceId;
      var planID = result.planId;

      var parameters, provisioningResult;
      var failedToDecrypt = false;
      try {
        parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
        provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      } catch (e) {
        console.log(util.format('Failed to decrypt record: \n' +
                                  '  encryted parameters: %s\n' +
                                  '  encryted provisioningResult: %s\n',
                                  parameters,
                                  provisioningResult
                                ));
        failedToDecrypt = true;
      }
      if (failedToDecrypt){
        failed_iids.push(instanceID);
        return callback(null);
      }

      var rg = provisioningResult.resourceGroup ? provisioningResult.resourceGroup : parameters.resourceGroup;
      var server = provisioningResult.name ? provisioningResult.name : parameters.cacheName;
      var key;
      var fqdn = provisioningResult.hostName;

      if (!(instanceID && serviceID && planID && rg && server && fqdn)) {
        console.log(util.format('Broken instance record: \n' +
                                  '  instanceID: %s\n' +
                                  '  serviceID: %s\n' +
                                  '  planID: %s\n' +
                                  '  resource group: %s\n' +
                                  '  server name: %s\n' +
                                  '  FQDN: %s\n',
                                  instanceID,
                                  serviceID,
                                  planID,
                                  rg,
                                  server,
                                  fullyQualifiedDomainName
                                ));
        failed_iids.push(instanceID);
        return callback(null);
      }

      async.waterfall([
        function(callback){
          listKeys(sp_config, rg, 'Microsoft.Cache/Redis', server, '2016-04-01', function(err, keys){
            if (err) {
              return callback(err);
            }
            key = keys.primaryKey;
            if (!key) {
              return callback(Error('Failed to list key.'));
            }
            callback(null);
          });
        },
        function(callback){
          // https://github.com/Azure/azure-service-broker/blob/master/pkg/services/rediscache/types.go
          var pc = util.format(
            '{\\\"armDeployment\\\":\\\"test\\\",' +
              '\\\"server\\\":\\\"%s\\\",' +
              '\\\"primaryKey\\\":\\\"%s\\\",' +
              '\\\"fullyQualifiedDomainName\\\":\\\"%s\\\"}',
            server,
            key,
            fqdn
          );

          insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback);
        },
        function(callback){
          var sql = util.format('SELECT * FROM bindings WHERE instanceId=\'%s\'', instanceID);
          executeSql(mssql_config, sql, function(err, results) {
            if (err) {
              callback(err);
            }

            async.eachSeries(results, function(result, callback) {
              var bindingResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.bindingId, result.bindingResult));
              var bindingID = result.bindingId;
              console.log('    Migrating binding with id %s ...', bindingID);

              if (!bindingID) {
                failed_bids.push(bindingID);
                console.log('Broken binding record without bindingID.');
                return callback(null);
              }

              var bc = '{}';

              insert_bc(bindingID, instanceID, bc, redis_config, callback);
            }, function(err){
              callback(err);
            });

          });
        }
      ], function(err){
        if (err) {
          console.log(err);
          failed_iids.push(instanceID);
        }
        callback(null);
      });
    }, function(err) {
      callback(err);
    });

  });
}

function migrate_azure_storage(mssql_config, redis_config, sp_config, callback) {
  var sql = 'SELECT * FROM instances WHERE azureInstanceId like \'azure-storage-%\'';

  console.log('Getting records of azure-storage instances...');
  executeSql(mssql_config, sql, function(err, results) {
    if (err) {
      callback(err);
    }

    async.eachSeries(results, function(result, callback){
      var instanceID = result.instanceId;
      console.log('  Migrating instance with ID %s ...', instanceID);
      var serviceID = result.serviceId;
      var planID = result.planId;

      var parameters, provisioningResult;
      var failedToDecrypt = false;
      try {
        parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
        provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      } catch (e) {
        console.log(util.format('Failed to decrypt record: \n' +
                                  '  encryted parameters: %s\n' +
                                  '  encryted provisioningResult: %s\n',
                                  parameters,
                                  provisioningResult
                                ));
        failedToDecrypt = true;
      }
      if (failedToDecrypt){
        failed_iids.push(instanceID);
        return callback(null);
      }

      var rg = provisioningResult.resourceGroupResult.resourceGroupName;
      var accountName = provisioningResult.storageAccountResult.storageAccountName;
      var key;

      if (!(instanceID && serviceID && planID && rg && accountName)) {
        console.log(util.format('Broken instance record: \n' +
                                  '  instanceID: %s\n' +
                                  '  serviceID: %s\n' +
                                  '  planID: %s\n' +
                                  '  resource group: %s\n' +
                                  '  account name: %s\n',
                                  instanceID,
                                  serviceID,
                                  planID,
                                  rg,
                                  accountName
                                ));
        failed_iids.push(instanceID);
        return callback(null);
      }

      async.waterfall([
        function(callback){
          listKeys(sp_config, rg, 'Microsoft.Storage/storageAccounts', accountName, '2016-01-01', function(err, keys){
            if (err) {
              return callback(err);
            }
            key = keys['keys'][0]['value'];
            if (!(key)) {
              return callback(Error('Failed to list key.'));
            }
            callback(null);
          });
        },
        function(callback){
          // https://github.com/Azure/azure-service-broker/blob/master/pkg/services/storage/types.go
          var pc = util.format(
            '{\\\"armDeployment\\\":\\\"test\\\",' +
              '\\\"storageAccountName\\\":\\\"%s\\\",' +
              '\\\"accessKey\\\":\\\"%s\\\",' +
              '\\\"containerName\\\":\\\"\\\"}',
            accountName,
            key
          );

          insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback);
        },
        function(callback){
          var sql = util.format('SELECT * FROM bindings WHERE instanceId=\'%s\'', instanceID);
          executeSql(mssql_config, sql, function(err, results) {
            if (err) {
              callback(err);
            }

            async.eachSeries(results, function(result, callback) {
              var bindingResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.bindingId, result.bindingResult));
              var bindingID = result.bindingId;
              console.log('    Migrating binding with id %s ...', bindingID);

              if (!bindingID) {
                failed_bids.push(bindingID);
                console.log('Broken binding record without bindingID.');
                return callback(null);
              }

              var bc = '{}';

              insert_bc(bindingID, instanceID, bc, redis_config, callback);
            }, function(err){
              callback(err);
            });

          });
        }
      ], function(err){
        if (err) {
          console.log(err);
          failed_iids.push(instanceID);
        }
        callback(null);
      });
    }, function(err) {
      callback(err);
    });

  });
}

function migrate_azure_servicebus(mssql_config, redis_config, sp_config, callback) {
  var sql = 'SELECT * FROM instances WHERE azureInstanceId like \'azure-servicebus-%\'';

  console.log('Getting records of azure-servicebus instances...');
  executeSql(mssql_config, sql, function(err, results) {
    if (err) {
      callback(err);
    }

    async.eachSeries(results, function(result, callback){
      var instanceID = result.instanceId;
      console.log('  Migrating instance with ID %s ...', instanceID);
      var serviceID = result.serviceId;
      var planID = result.planId;

      var parameters, provisioningResult;
      var failedToDecrypt = false;
      try {
        parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
        provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      } catch (e) {
        console.log(util.format('Failed to decrypt record: \n' +
                                  '  encryted parameters: %s\n' +
                                  '  encryted provisioningResult: %s\n',
                                  parameters,
                                  provisioningResult
                                ));
        failedToDecrypt = true;
      }
      if (failedToDecrypt){
        failed_iids.push(instanceID);
        return callback(null);
      }

      var rg = provisioningResult.resourceGroupName;
      var namespaceName = provisioningResult.namespaceName;
      var key;
      var connectionString;

      if (!(instanceID && serviceID && planID && rg && namespaceName)) {
        console.log(util.format('Broken instance record: \n' +
                                  '  instanceID: %s\n' +
                                  '  serviceID: %s\n' +
                                  '  planID: %s\n' +
                                  '  resource group: %s\n' +
                                  '  namespace name: %s\n',
                                  instanceID,
                                  serviceID,
                                  planID,
                                  rg,
                                  namespaceName
                                ));
        failed_iids.push(instanceID);
        return callback(null);
      }

      async.waterfall([
        function(callback){
          listKeys(sp_config, rg, 'Microsoft.ServiceBus/Namespaces', namespaceName + '/authorizationRules/RootManageSharedAccessKey', '2015-08-01', function(err, keys){
            if (err) {
              return callback(err);
            }
            key = keys.primaryKey;
            connectionString = keys.primaryConnectionString;
            if (!(key && connectionString)) {
              return callback(Error('Failed to list key.'));
            }
            callback(null);
          });
        },
        function(callback){
          // https://github.com/Azure/azure-service-broker/blob/master/pkg/services/servicebus/types.go
          var pc = util.format(
            '{\\\"armDeployment\\\":\\\"test\\\",' +
              '\\\"serviceBusNamespaceName\\\":\\\"%s\\\",' +
              '\\\"connectionString\\\":\\\"%s\\\",' +
              '\\\"primaryKey\\\":\\\"%s\\\"}',
            namespaceName,
            connectionString,
            key
          );

          insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback);
        },
        function(callback){
          var sql = util.format('SELECT * FROM bindings WHERE instanceId=\'%s\'', instanceID);
          executeSql(mssql_config, sql, function(err, results) {
            if (err) {
              callback(err);
            }

            async.eachSeries(results, function(result, callback) {
              var bindingResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.bindingId, result.bindingResult));
              var bindingID = result.bindingId;
              console.log('    Migrating binding with id %s ...', bindingID);

              if (!bindingID) {
                failed_bids.push(bindingID);
                console.log('Broken binding record without bindingID.');
                return callback(null);
              }

              var bc = '{}';

              insert_bc(bindingID, instanceID, bc, redis_config, callback);
            }, function(err){
              callback(err);
            });

          });
        }
      ], function(err){
        if (err) {
          console.log(err);
          failed_iids.push(instanceID);
        }
        callback(null);
      });
    }, function(err) {
      callback(err);
    });

  });
}

function migrate_azure_eventhubs(mssql_config, redis_config, sp_config, callback) {
  var sql = 'SELECT * FROM instances WHERE azureInstanceId like \'azure-eventhubs-%\'';

  console.log('Getting records of azure-eventhubs instances...');
  executeSql(mssql_config, sql, function(err, results) {
    if (err) {
      callback(err);
    }

    async.eachSeries(results, function(result, callback){
      var instanceID = result.instanceId;
      console.log('  Migrating instance with ID %s ...', instanceID);
      var serviceID = result.serviceId;
      var planID = result.planId;

      var parameters, provisioningResult;
      var failedToDecrypt = false;
      try {
        parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
        provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      } catch (e) {
        console.log(util.format('Failed to decrypt record: \n' +
                                  '  encryted parameters: %s\n' +
                                  '  encryted provisioningResult: %s\n',
                                  parameters,
                                  provisioningResult
                                ));
        failedToDecrypt = true;
      }
      if (failedToDecrypt){
        failed_iids.push(instanceID);
        return callback(null);
      }

      var rg = provisioningResult.resourceGroupName;
      var namespaceName = provisioningResult.namespaceName;
      var eventhubName = provisioningResult.eventHubName;
      var key;
      var connectionString;

      if (!(instanceID && serviceID && planID && rg && namespaceName && eventhubName)) {
        console.log(util.format('Broken instance record: \n' +
                                  '  instanceID: %s\n' +
                                  '  serviceID: %s\n' +
                                  '  planID: %s\n' +
                                  '  resource group: %s\n' +
                                  '  namespace name: %s\n' +
                                  '  eventhub name: %s\n',
                                  instanceID,
                                  serviceID,
                                  planID,
                                  rg,
                                  namespaceName,
                                  eventhubName
                                ));
        failed_iids.push(instanceID);
        return callback(null);
      }

      async.waterfall([
        function(callback){
          listKeys(sp_config, rg, 'Microsoft.EventHub/namespaces', namespaceName + '/authorizationRules/RootManageSharedAccessKey', '2015-08-01', function(err, keys){
            if (err) {
              return callback(err);
            }
            key = keys.primaryKey;
            connectionString = keys.primaryConnectionString;
            if (!(key && connectionString)) {
              return callback(Error('Failed to list key.'));
            }
            callback(null);
          });
        },
        function(callback){
          // https://github.com/Azure/azure-service-broker/blob/master/pkg/services/eventhub/types.go
          var pc = util.format(
            '{\\\"armDeployment\\\":\\\"test\\\",' +
              '\\\"eventHubName\\\":\\\"%s\\\",' +
              '\\\"eventHubNamespace\\\":\\\"%s\\\",' +
              '\\\"connectionString\\\":\\\"%s\\\",' +
              '\\\"primaryKey\\\":\\\"%s\\\"}',
            eventhubName,
            namespaceName,
            connectionString,
            key
          );

          insert_pc(instanceID, serviceID, planID, rg, pc, redis_config, callback);
        },
        function(callback){
          var sql = util.format('SELECT * FROM bindings WHERE instanceId=\'%s\'', instanceID);
          executeSql(mssql_config, sql, function(err, results) {
            if (err) {
              callback(err);
            }

            async.eachSeries(results, function(result, callback) {
              var bindingResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.bindingId, result.bindingResult));
              var bindingID = result.bindingId;
              console.log('    Migrating binding with id %s ...', bindingID);

              if (!bindingID) {
                failed_bids.push(bindingID);
                console.log('Broken binding record without bindingID.');
                return callback(null);
              }

              var bc = '{}';

              insert_bc(bindingID, instanceID, bc, redis_config, callback);
            }, function(err){
              callback(err);
            });

          });
        }
      ], function(err){
        if (err) {
          console.log(err);
          failed_iids.push(instanceID);
        }
        callback(null);
      });
    }, function(err) {
      callback(err);
    });

  });
}

assert(process.argv[2] != undefined);
var doc = yaml.safeLoad(fs.readFileSync(process.argv[2], 'utf8'));
var mssql_config = getMssqlConfigurations(doc.applications[0].env);
var sp_config = getSpConfigurations(doc.applications[0].env);

assert(process.argv[3] != undefined);
var doc2 = yaml.safeLoad(fs.readFileSync(process.argv[3], 'utf8'));
var redis_config = getRedisConfigurations(doc2.applications[0].env);

var new_sql_servers = [];
if (process.argv[4] != undefined) {
  var buf = fs.readFileSync(process.argv[4], "utf8");

  new_sql_servers = buf.replace(new RegExp('\r', 'g'), '')
                       .split('\n')
                       .map(Function.prototype.call, String.prototype.trim);
}

async.waterfall([
  function(callback){
    // migrate azure-sqldb
    migrate_azure_sqldb(mssql_config, redis_config, callback);
  },
  function(callback){
    // migrate azure-rediscache
    migrate_azure_rediscache(mssql_config, redis_config, sp_config, callback);
  },
  function(callback){
    // migrate azure-storage
    migrate_azure_storage(mssql_config, redis_config, sp_config, callback);
  },
  function(callback){
    // migrate azure-servicebus
    migrate_azure_servicebus(mssql_config, redis_config, sp_config, callback);
  },
  function(callback){
    // migrate azure-eventhubs
    migrate_azure_eventhubs(mssql_config, redis_config, sp_config, callback);
  }
], function(err){
  if (err) {
    console.error(err);
  }

  console.log('Summary:');
  if (failed_iids.length > 0) {
    console.log('  Failed Instance IDs:', failed_iids);
  }
  if (failed_bids.length > 0) {
    console.log('  Failed Binding IDs:', failed_bids);
  }
});
