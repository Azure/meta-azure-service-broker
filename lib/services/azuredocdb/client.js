/* jshint camelcase: false */
/* jshint newcap: false */

var request = require('request');
var util = require('util');
var HttpStatus = require('http-status-codes');
var crypto = require('crypto');
var moment = require('moment');

var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');

var azureProperties;
var environment;
var log;
var API_VERSIONS;
var docDbUrlTemplate = '%ssubscriptions/%s/resourcegroups/%s/providers/Microsoft.DocumentDB/databaseAccounts/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, docDbAccountName
  
exports.initialize = function(azure, logger) {
  log = logger;
  azureProperties = azure;
  API_VERSIONS = common.API_VERSION[azure.environment];
  environment = common.getEnvironment(azure.environment);
};

exports.createResourceGroup = function(resourceGroupName, location, callback) {
  resourceGroup.createOrUpdate(
    'DocDb',
    azureProperties,
    resourceGroupName,
    { 'location': location },
    log,
    callback
  );
};

exports.getDocDbAccount = function(resourceGroupName, docDbAccountName, callback) {
  msRestRequest.GET(
    util.format(
      docDbUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      docDbAccountName),
    common.mergeCommonHeaders(log, 'Docdb - getDocDbAccount', {}),
    API_VERSIONS.DOCDB,
    callback
  );
};

exports.createDocDbAccount = function(resourceGroupName, docDbAccountName, params, callback) {
  msRestRequest.PUT(
    util.format(
      docDbUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      docDbAccountName),
    common.mergeCommonHeaders(log, 'Docdb - createDocDbAccount', {}),
    params,
    API_VERSIONS.DOCDB,
    function (err, res, body) {
      common.logHttpResponse(log, res, 'Docdb - createDocDbAccount', true);
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

exports.getAccountKey = function(resourceGroupName, docDbAccountName, callback) {
  msRestRequest.POST(
    util.format(
      docDbUrlTemplate + '/listKeys',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      docDbAccountName),
    common.mergeCommonHeaders(log, 'Docdb - getAccountKey', {'Content-Type': 'application/json'}),
    null,
    API_VERSIONS.DOCDB,
    function(err, res, body) {
      common.logHttpResponse(log, res, 'Docdb - getAccountKey', false);
      if (err) {
        return callback(err);
      }
      if (res.statusCode != HttpStatus.OK) {
        return common.formatErrorFromRes(res, callback);
        
      }
      
      var b = JSON.parse(body);
      callback(null, b.primaryMasterKey);
    }
  );
};

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

exports.createDocDbDatabase = function(documentEndpoint, masterKey, databaseName, callback) {
  var headers = {
    'x-ms-version': '2016-07-11',
    'x-ms-date': moment().format('ddd, DD MMM YYYY HH:mm:ss') + ' GMT'
  };
  
  headers = util._extend(headers, {'Authorization': getAuthorizationTokenUsingMasterKey('post', undefined, 'dbs', headers, masterKey)} );
  
  request.post({
    url: documentEndpoint.replace(':443', '') + 'dbs',
    headers: headers,
    json: {'id': databaseName}
  }, function(err, res, body){
    if (err) {
      return callback(err);
    }
    if (res.statusCode != HttpStatus.CREATED) {
      return common.formatErrorFromRes(res, callback);
    }
    callback(null, body);
  });
  
};

exports.deleteDocDbAccount = function(resourceGroupName, docDbAccountName, callback) {
  msRestRequest.DELETE(
    util.format(
      docDbUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName,
      docDbAccountName),
    common.mergeCommonHeaders(log, 'Docdb - getDocDbAccount', {}),
    API_VERSIONS.DOCDB,
    function (err, res, body) {
      common.logHttpResponse(log, res, 'Docdb - deleteDocDbAccount', true);
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

