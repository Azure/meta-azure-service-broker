/* jshint camelcase: false */
/* jshint newcap: false */

var request = require('request');
var util = require('util');
var HttpStatus = require('http-status-codes');
var crypto = require('crypto');

var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');

var azureProperties;
var environment;
var API_VERSIONS;
var cosmosDbUrlTemplate = '%s/subscriptions/%s/resourcegroups/%s/providers/Microsoft.DocumentDB/databaseAccounts/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, cosmosDbAccountName
  
exports.initialize = function(azure) {
  azureProperties = azure;
  API_VERSIONS = common.API_VERSION[azure.environment];
  environment = common.getEnvironment(azure.environment);
};

exports.createResourceGroup = function(resourceGroupName, location, callback) {
  resourceGroup.createOrUpdate(
    'CosmosDb',
    azureProperties,
    resourceGroupName,
    { 'location': location },
    callback
  );
};

exports.getCosmosDbAccount = function(resourceGroupName, cosmosDbAccountName, callback) {
  var url = util.format(
    cosmosDbUrlTemplate,
    environment.resourceManagerEndpointUrl,
    azureProperties.subscriptionId,
    resourceGroupName,
    cosmosDbAccountName);
  
  msRestRequest.GET(
    url,
    common.mergeCommonHeaders('Cosmosdb - getCosmosDbAccount', {}),
    API_VERSIONS.COSMOSDB,
    function(err, res, body){
      common.logHttpResponse(res, 'Cosmosdb - getCosmosDbAccount', true);
      callback(err, res, body);
    }
  );
};

exports.createCosmosDbAccount = function(resourceGroupName, cosmosDbAccountName, params, callback) {
  var url = util.format(
    cosmosDbUrlTemplate,
    environment.resourceManagerEndpointUrl,
    azureProperties.subscriptionId,
    resourceGroupName,
    cosmosDbAccountName);
  
  msRestRequest.PUT(
    url,
    common.mergeCommonHeaders('Cosmosdb - createCosmosDbAccount', {}),
    params,
    API_VERSIONS.COSMOSDB,
    function (err, res, body) {
      common.logHttpResponse(res, 'Cosmosdb - createCosmosDbAccount', true);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK) {
        return common.formatErrorFromRes(res, callback);
      }
      callback(null);
    }
  );
};

exports.getAccountKey = function(resourceGroupName, cosmosDbAccountName, callback) {
  var url = util.format(
    cosmosDbUrlTemplate + '/listKeys',
    environment.resourceManagerEndpointUrl,
    azureProperties.subscriptionId,
    resourceGroupName,
    cosmosDbAccountName);
    
  msRestRequest.POST(
    url,
    common.mergeCommonHeaders('Cosmosdb - getAccountKey', {'Content-Type': 'application/json'}),
    null,
    API_VERSIONS.COSMOSDB,
    function(err, res, body) {
      common.logHttpResponse(res, 'Cosmosdb - getAccountKey', false);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK) {
        return common.formatErrorFromRes(res, callback);
      }
      
      var b = JSON.parse(body);
      callback(null, b.primaryMasterKey, b.primaryReadonlyMasterKey);
    }
  );
};

// Refer to https://docs.microsoft.com/en-us/rest/api/documentdb/access-control-on-documentdb-resources?redirectedfrom=MSDN
function getAuthorizationTokenUsingMasterKey(verb, resourceId, resourceType, headers, masterKey) {
    var key = new Buffer(masterKey, 'base64');

    var text = (verb || '').toLowerCase() + '\n' +
               (resourceType || '').toLowerCase() + '\n' +
               (resourceId || '') + '\n' +
               (headers['x-ms-date'] || '').toLowerCase() + '\n\n';

    var body = new Buffer(text, 'utf8');
    
    var signature = crypto.createHmac('sha256', key).update(body).digest('base64');

    var MasterToken = 'master';

    var TokenVersion = '1.0';

    return 'type=' + MasterToken + '&ver=' + TokenVersion + '&sig=' + signature;
}

exports.createDocDbDatabase = function createDocDbDatabase(hostEndpoint, masterKey, databaseName, callback) {
  var headers = {
    'Cache-Control': 'no-cache',
    'x-ms-version': '2016-07-11',
    'x-ms-date': new Date().toUTCString()
  };
  
  headers = util._extend(headers, {'Authorization': getAuthorizationTokenUsingMasterKey('post', undefined, 'dbs', headers, masterKey)} );
  
  request.post({
    url: hostEndpoint.replace(':443', '') + 'dbs',
    headers: headers,
    json: {'id': databaseName}
  }, function(err, res, body){
    if (err) {
      return callback(err);
    }
    common.logHttpResponse(res, 'Cosmosdb - createDocDbDatabase', true);
    if (res.statusCode != HttpStatus.CREATED) {
      if (res.statusCode == HttpStatus.UNAUTHORIZED)
        return createDocDbDatabase(hostEndpoint, masterKey, databaseName, callback);
      else
        return common.formatErrorFromRes(res, callback);
    }
    callback(null, body);
  });
  
};

exports.deleteCosmosDbAccount = function(resourceGroupName, cosmosDbAccountName, callback) {
  var url = util.format(
    cosmosDbUrlTemplate,
    environment.resourceManagerEndpointUrl,
    azureProperties.subscriptionId,
    resourceGroupName,
    cosmosDbAccountName);
  msRestRequest.DELETE(
    url,
    common.mergeCommonHeaders('Cosmosdb - deleteCosmosDbAccount', {}),
    API_VERSIONS.COSMOSDB,
    function (err, res, body) {
      common.logHttpResponse(res, 'Cosmosdb - deleteCosmosDbAccount', true);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.ACCEPTED && res.statusCode != HttpStatus.NO_CONTENT) { // It returns status code 204 if the account is not existed
        return common.formatErrorFromRes(res, callback);
      }
      
      callback(null, body);
    }
  );
};

