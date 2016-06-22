var params = require('./params');
var async = require('async');
var util = require('util');
var azureTokenRestOps = require('../azureTokenRestOps');

var tokenOps = new azureTokenRestOps(null, params);

tokenOps.getToken(function(err, accessToken) {
    console.log(accessToken);
});