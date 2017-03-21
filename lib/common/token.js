/*jshint camelcase: false */

var request = require('request');
var util = require('util');
var common = require('./index');
var HttpStatus = require('http-status-codes');

var environment;
var azureProperties;
var apiVersion;

var tokenCache;

exports.init = function(_environment, _azureProperties, _apiVersion) {
  environment = _environment;
  azureProperties = _azureProperties;
  apiVersion = _apiVersion;
};

function updateToken(callback) {
  request.post({
    url: util.format('%s/%s/oauth2/token', environment.activeDirectoryEndpointUrl, azureProperties.tenantId),
    qs: {'api-version' : apiVersion},
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
      'grant_type': 'client_credentials',
      'client_id': azureProperties.clientId,
      'client_secret': azureProperties.clientSecret,
      'resource': environment.resourceManagerEndpointUrl,
      'scope': 'user_impersonation'
    }
  }, function(err, response, body){
    common.logHttpResponse(response, 'Update authorization token', false);
    if (err) {
      return callback(err);
    }
    if (response.statusCode == HttpStatus.OK) {
      var b = JSON.parse(body);
      tokenCache = b.access_token;
      callback(null, tokenCache);
    } else {
      var e = new Error(body);
      e.statusCode = response.statusCode;
      callback(e);
    }
  });
}

exports.getToken = function(update, callback) {
  if (update || tokenCache === undefined) {
    updateToken(callback);
  } else {
    callback(null, tokenCache);
  }
};
