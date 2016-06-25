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

                sqldbOperations.provision(accessToken, reqParams, function (err, result) {
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

    this.resourceGroupWasProvided = function () {
        if (_.isString(resourceGroupName)) {
            if (resourceGroupName.length !== 0) return true;
        }
        log.error('SqlDb Provision: Resource Group name was not provided. Did you supply the parameters file?');
        return false;
    };

    this.sqlServerNameWasProvided = function () {
        if (_.isString(reqParams.sqlServerName)) {
            if (reqParams.sqlServerName !== 0) return true;
        }
        log.error('SqlDb Provision: SQL Server name was not provided.');
        return false;
    };

    this.sqlDbNameWasProvided = function () {
        if (_.isString(reqParams.sqldbName)) {
            if (reqParams.sqldbName !== 0) return true;
        }
        log.error('SqlDb Provision: SQL DB name was not provided.');
        return false;
    };

    this.sqlDbCreateModeWasProvided = function () {  // must be 'Default'
        if (_.isString(reqParams.sqldbParameters.properties.createMode)) {
            if (reqParams.sqldbParameters.properties.createMode === 'Default') return true;
        }
        log.error('SqlDb Provision: SQL DB createMode was not provided.');
        return false;
    };

    this.sqlDbEditionWasProvided = function () {
        if (_.isString(reqParams.sqldbParameters.properties.edition)) {
            var edition = reqParams.sqldbParameters.properties.edition.toLowerCase();
            var permittedValues = ['basic', 'standard', 'premium'];
            if (_.indexOf(permittedValues, edition) != -1) return true;
        }
        log.error('SqlDb Provision: SQL DB edition was not provided.');
        return false;
    };

    this.sqlDbCollationWasProvided = function () {
        if (_.isString(reqParams.sqldbParameters.properties.collation)) {
            var collation = reqParams.sqldbParameters.properties.collation;
            var permittedValues = ['SQL_Latin1_General_CP1_CI_AS'];
            if (_.indexOf(permittedValues, collation) != -1) return true;
        } log.error('SqlDb Provision: SQL DB collation was not provided.');
        return false;
    };

    this.sqlDbMaxSizeBytesWasProvided = function () {
        if (_.isString(reqParams.sqldbParameters.properties.maxSizeBytes)) {
            if (reqParams.sqldbParameters.properties.maxSizeBytes === '2147483648') return true;
        }
        log.error('SqlDb Provision: SQL DB maxSizeBytes was not provided.');
        return false;
    };

    this.sqlDbRsoNameWasProvided = function () {
        if (_.isString(reqParams.sqldbParameters.properties.requestedServiceObjectiveName)) {
            if (reqParams.sqldbParameters.properties.requestedServiceObjectiveName === 'Basic') return true;
        }
        log.error('SqlDb Provision: SQL DB requested service objective name was not provided.');
        return false;
    };

    this.allValidatorsSucceed = function () {
        return this.resourceGroupWasProvided()
            && this.sqlServerNameWasProvided()
            && this.sqlDbNameWasProvided()
            && this.sqlDbCreateModeWasProvided()
            && this.sqlDbEditionWasProvided()
            && this.sqlDbCollationWasProvided()
            && this.sqlDbRsoNameWasProvided()
            && this.sqlDbMaxSizeBytesWasProvided();
    };
};

module.exports = sqldbProvision;
