/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');

var sqldbProvision = function (log, params) {

    // log.muteOnly('debug');

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};

    var resourceGroupName = reqParams.resourceGroup || '';

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
                sqldbOperations.getToken(function(err, accessToken) {
                    if (err) {
                        log.error('sqldb, unabl: to get token, err: %j', err);
                        return callback(err);
                    } else {
                        log.debug('cmd-provision: sqldbOperations.getToken: accessToken: %j', accessToken);
                        callback(err, accessToken);
                    }
                });
            },
            function(accessToken, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/resourceGroup.checkExistence');
                resourceGroup.checkExistence(resourceGroupName, function (err, checkExistenceResult, req, res) {
                    if (err) {
                        log.error('sqldb: resourceGroup.checkExistence: err: %j', err);
                        return callback(err);
                    } else {
                        log.debug('sqldb cmd-provision: resourceGroup.checkExistence: checkExistenceResult: %j', checkExistenceResult);
                        callback(err, checkExistenceResult);
                    }
                });
            },
            function (checkExistenceResult, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/resourceGroup.createOrUpdate');
                if (checkExistenceResult === false) {
                    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function (err, createRGResult, req, res) {
                        if (err) {
                            log.error('sqldb, resourceGroup.createOrUpdate: err: %j', err);
                            return callback(err);
                        } else {
                            log.debug('cmd-provision: resourceGroup.createOrUpdate: createRGResult: %j', createRGResult);
                            callback(err, createRGResult);
                        }
                    });
                } else {
                    callback(null, undefined);
                }
            },
            function(createRGResult, callback) {
                log.debug('sqldb cmd-provision: async.waterfall/provision the database');
                callback(null, 'OK');
            }
        ], function (err, result) {
            log.debug('sqldb cmd-provision: async.waterfall/final callback');
            next(err, result);
        });
    };

    // validators

    this.allValidatorsSucceed = function () {
        return true;
    };
};

module.exports = sqldbProvision;
