/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');

var sqldbProvision = function(log, params) {

    log.muteOnly('debug');

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};

    var resourceGroupName = reqParams.resourceGroup || '';
    var cacheName = reqParams.cacheName || '';

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.provision = function(sqldb, resourceGroup, next) {

        var groupParameters = {
            location: location
        };

    }

    // validators

    this.allValidatorsSucceed = function() {
        return true;

    };
}

module.exports = sqldbProvision;
