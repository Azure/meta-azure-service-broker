/* 
 * This is a script for migrating Azure Service Broker from lower than 1.4.0 to 1.4.0 or greater.
 * Usage: "node migration.js <path-to-manifest.yml>"
 * NOTE: The version of node module 'mssql' is 3.1.2.
 *       The version of node module 'js-yaml' is 3.1.0.
 */
 
var crypto = require('crypto');
var sqlDb = require('mssql');
var yaml = require('js-yaml');
var fs = require('fs');
var assert = require('assert');
var util = require('util');

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
        return setTimeout(executeSql(config, sql, callback, retry-1, retryInterval), retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.query(sql, function(err, recordset) {
      conn.close();
      callback(err, recordset);
    });
  });
};

function getConfigurations(env) {
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


try {  
  assert(process.argv[2] != undefined);
  var doc = yaml.safeLoad(fs.readFileSync(process.argv[2], 'utf8'));
  
  var mssql_config = getConfigurations(doc.applications[0].env);

  // update instances
  
  var sql1 = 'SELECT * FROM instances WHERE azureInstanceId like 'azure-sqldb-%';
  
  executeSql(mssql_config, sql1, function(err, results) {
    if (err) {
      throw (err);
    }
    
    results.forEach(function(result){
      var parameters = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.parameters));
      var provisioningResult = JSON.parse(decryptText(mssql_config.encryptionKey, result.instanceId, result.provisioningResult));
      provisioningResult.resourceGroup = parameters.resourceGroup;
      provisioningResult = encryptText(mssql_config.encryptionKey, result.instanceId, JSON.stringify(provisioningResult));

      var sql2 = util.format('UPDATE instances SET provisioningResult=\'%s\', timestamp=getdate() where instanceId=\'%s\'',
                   provisioningResult,
                   result.instanceId);

      executeSql(mssql_config, sql2, function(err) {
        if (err) {
          throw (err);
        }
      });
    });
    
  });

} catch (e) {
  console.log(e);
}