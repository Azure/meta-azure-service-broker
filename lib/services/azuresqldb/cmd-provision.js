/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');

var sqldbProvision = function (log, params) {

    // log.muteOnly('debug');

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};

    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.debug('sqldb cmd-provision: resourceGroupName: {0}, sqldbName: {1}, sqlServerName: {2}'.format(resourceGroupName, sqldbName, sqlServerName));

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.provision = function (sqldbOperations, resourceGroup, next) {

        var groupParameters = {
            location: location
        };

        async.waterfall([
            function (callback) {
                log.debug('sqldb cmd-provision: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-provision: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        callback(err, accessToken);
                    }
                });
            },
            function (accessToken, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/resourceGroup.checkExistence: accessToken: %j', accessToken);
                resourceGroup.checkExistence(resourceGroupName, function (err, checkExistenceResult, req, res) {
                    if (err) {
                        log.error('sqldb: resourceGroup.checkExistence: err: %j', err);
                        return callback(err);
                    } else {
                        callback(err, checkExistenceResult, accessToken);
                    }
                });
            },
            function (checkExistenceResult, accessToken, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/resourceGroup.createOrUpdate: checkExistenceResult: %j', checkExistenceResult);
                log.debug('sqldb cmd-provision: async.waterfall/resourceGroup.createOrUpdate: accessToken: %j', accessToken);
                if (checkExistenceResult === false) {
                    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function (err, createRGResult, req, res) {
                        if (err) {
                            log.error('sqldb cmd-provision: async.waterfall/resourceGroup.createOrUpdate: err: %j', err);
                            return callback(err);
                        } else {
                            callback(err, createRGResult, accessToken);
                        }
                    });
                } else {
                    callback(null, undefined, accessToken);
                }
            },
            function (createRGResult, accessToken, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/provision the database: createRGResult: %j', createRGResult);
                log.debug('sqldb cmd-provision: async.waterfall/provision the database: token: %j', accessToken);

                var parms = {};
                sqldbOperations.provision(accessToken, resourceGroupName, sqlServerName, sqldbName, parms, function (err, result) {
                    if (err) {
                        log.error('sqldb cmd-provision: async.waterfall/provision the database: err: %j', err);
                        return callback(err);
                    } else {
                        callback(err, result);
                    }
                });
            }
        ], function (err, result) {
            log.debug('sqldb cmd-provision: async.waterfall/final callback: result: ', result);
            next(err, result);
        });
    };

    // validators

    this.allValidatorsSucceed = function () {
        return true;
    };
};

module.exports = sqldbProvision;
