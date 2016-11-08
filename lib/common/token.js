/*jshint camelcase: false */

var request = require('request');
var util = require('util');
var common = require('./index');

module.exports.getToken = function(environment, azureProperties, apiVersion, log, callback) {
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
    common.logHttpResponse(log, response, 'Get authorization token', false);
    if(err) {
        callback(err);
    } else {
        if (response.statusCode == 200) {
          var b = JSON.parse(body);
          callback(null, b.access_token);
        } else {
          var e = new Error(body);
          e.statusCode = response.statusCode;
          callback(e);
        }
    }
  });
};
