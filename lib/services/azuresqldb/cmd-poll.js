/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');

var sqldbPoll = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.debug('sqldb cmd-poll: resourceGroupName: {0}, sqldbName: {1}, sqlServerName: {2}'.format(resourceGroupName, sqldbName, sqlServerName));

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.poll = function (sqldbOperations, next) {

        var groupParameters = {
            location: location
        };

        async.waterfall([
            function (callback) {
                log.debug('sqldb cmd-poll: async.waterfall/getToken');
                sqldbOperations.getToken(function (err, accessToken) {
                    if (err) {
                        log.error('sqldb cmd-poll: async.waterfall/getToken: err: %j', err);
                        return callback(err);
                    } else {
                        sqldbOperations.setParameters(accessToken, resourceGroupName, sqlServerName, sqldbName);
                        callback(null);
                    }
                });
            },
            function (callback) {   // get status of database
                log.debug('sqldb cmd-poll: async.waterfall/check existence of database');
                sqldbOperations.getDatabase(function (err, result) {
                    var reply = {
                        state: "",
                        description: ""
                    };
                    if (err) {
                        log.error('sqldb cmd-poll: async.waterfall/check existence of sql database: err: %j', err);
                        callback(err);
                    } else {
                        log.debug('sqldb cmd-poll: async.waterfall/check existence of sql database: result: %j', result);
                        log.debug('sqldb cmd-poll: async.waterfall/check existence of sql database: lastoperation: %j', lastoperation);
                        if (lastoperation === 'provision') {
                            log.debug('sqldb cmd-poll: async.waterfall/check existence of sql database: provision');
                            if (result.statusCode === HttpStatus.OK) {

                                result.body.sqlServerName = reqParams.sqlServerName;
                                result.body.administratorLogin = reqParams.sqlServerParameters.properties.administratorLogin;
                                result.body.administratorLoginPassword = reqParams.sqlServerParameters.properties.administratorLoginPassword;
                                
                                reply.state = 'succeeded';
                                reply.description = 'Created logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                            } else if (result.statusCode === HttpStatus.NOT_FOUND) { 

                                reply.state = 'creating';
                                reply.description = 'Creating logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';

                            }
                        } else if (lastoperation === 'deprovision') {
                            log.debug('sqldb cmd-poll: async.waterfall/check existence of sql database: deprovision');
                            if (result.statusCode === HttpStatus.OK) {
                                reply.state = 'in progress';
                                reply.description = 'Deleting the database.';
                            } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                                reply.state = 'succeeded';
                                reply.description = 'Database has been deleted.';
                            }
                        }
                        result.value = reply;
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
            log.debug('sqldb cmd-poll: async.waterfall/final callback: result: ', result);
            next(err, result);
        });

    };

    // validators
    this.resourceGroupWasProvided = function () {
        if (_.isString(resourceGroupName)) {
            if (resourceGroupName.length !== 0) return true;
        }
        log.error('SqlDb Poll: Resource Group name was not provided. Did you supply the parameters file?');
        return false;
    };

    this.allValidatorsSucceed = function () {
        return this.resourceGroupWasProvided()
    };

};

module.exports = sqldbPoll;

