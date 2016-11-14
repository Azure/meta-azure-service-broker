/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqlServerPoll = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-serverInfo: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.serverInfo = function (sqldbOperations, next) {

        var groupParameters = {
            location: location
        };

        async.waterfall([
            function (callback) {
                log.info('sqldb cmd-serverInfo: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-serverInfo: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        sqldbOperations.setParameters(accessToken, resourceGroupName, sqlServerName, sqldbName);
                        callback(null);
                    }
                });
            },
            function (callback) {   // get status of server
                log.info('sqldb cmd-serverInfo: async.waterfall/check existence of server');
                sqldbOperations.getServer({}, function (err, result) {
                    if (err) {
                        log.error('sqldb cmd-serverInfo: async.waterfall/check existence of sql server: err: %j', err);
                        callback(err);
                    } else {
                        log.info('sqldb cmd-serverInfo: async.waterfall/check existence of sql server: result: %j', result);
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
            log.info('sqldb cmd-serverInfo: async.waterfall/final callback: result: ', result);
            next(err, result);
        });

    };

};

module.exports = sqlServerPoll;

