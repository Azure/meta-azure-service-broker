/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var msRestRequest = require('../../common/msRestRequest');
var log = common.getLogger(Config.name);

var sqldbPoll = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result || {};
    var lastoperation = params.last_operation || '';
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';
    var tde = reqParams.transparentDataEncryption;
    if (tde === undefined) tde = params.defaultSettings.sqldb.transparentDataEncryption;

    log.info(util.format('sqldb cmd-poll: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.poll = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        if (params.plan_id === '4b1cfc28-dda6-407b-abeb-7aa0b89f52bf') {
            // we only need handle (lastoperation === 'provision' || lastoperation === 'deprovision') for the plan as update is prevented.
            var result = {};
            result.body = provisioningResult;
            result.value = {
                state: 'succeeded',
                description: 'Registered the database as a service instance.'
            };
            if (lastoperation === 'deprovision') {
                result.value.description = 'Unregistered the database.';
            }
            return next(null, result);
        } else if (lastoperation === 'update'){
            // Use the operationResult endpoint to poll long async requests like Update
            async.waterfall([
                function (callback){
                    var url = params.state.asyncOperation;
                    // Extract API version from the url query string:
                    // https://management.azure.com/subscriptions/<uuid>/resourceGroups/niroy-rg1/providers/Microsoft.Sql/servers/niroy-sqlsvr/databases/test-db/azureAsyncOperation/<uuid>?api-version=2014-04-01-Preview"
                    var version = url.match(/api-version=(.*)/)[1];
                    var headers = common.mergeCommonHeaders('AzureSQLDB - poll', { 'x-ms-version': version });
                    msRestRequest.GET(url, headers, version, callback);
                }
            ],
            function(err, result){
                log.debug('sqldb cmd-poll: async.waterfall/final callback: result: %j', result);
                var reply = {
                    state: '',
                    description: ''
                };

                var body = JSON.parse(result.body);
                switch (body.status){
                    case 'InProgress':
                        reply.state = 'in progress';
                        reply.description = 'Database is being updated.';
                        break;
                    case 'Succeeded':
                        reply.state = 'succeeded';
                        reply.description = 'Database has been updated.';
                        break;
                    default:
                        reply.state = 'failed';
                        reply.description = util.format('Error updating database: statusCode: %j body: %j', result.statusCode, result.body);
                }
                result.value = reply;
                return next(err, result);
            });
        } else {
            async.waterfall([
                function (callback) {
                    // get status of database
                    log.info('sqldb cmd-poll: async.waterfall/check existence of database');
                    sqldbOperations.getDatabase(function (err, result) {
                        var reply = {
                            state: '',
                            description: ''
                        };
                        if (err) {
                            log.error('sqldb cmd-poll: async.waterfall/check existence of sql database: err: %j', err);
                            callback(err);
                        } else {
                            log.info('sqldb cmd-poll: async.waterfall/check existence of sql database: result: %j', result);
                            log.info('sqldb cmd-poll: async.waterfall/check existence of sql database: lastoperation: %j', lastoperation);
                            if (lastoperation === 'provision') {
                                if (result.statusCode === HttpStatus.OK) {
                                    result.body = _.extend(result.body, provisioningResult);

                                    reply.state = 'succeeded';
                                    reply.description = 'Created logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                                } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                                    result.body = provisioningResult;

                                    reply.state = 'in progress';
                                    reply.description = 'Creating logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                                }
                            } else if (lastoperation === 'deprovision') {
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
                },
                function(result, callback) {   // Set Transparent data encryption
                    if ( lastoperation === 'provision' && result.value.state === 'succeeded' && tde === true){
                        log.info('sqldb cmd-poll: async.waterfall/Set transparent data encryption: Enabled');
                        sqldbOperations.setTransparentDataEncryption(function (err, tdeResult) {
                            if (err) {
                                callback(err);
                            } else if (tdeResult.statusCode === HttpStatus.OK || tdeResult.statusCode === HttpStatus.CREATED) {
                                log.info('sqldb cmd-poll: async.waterfall/setTransparentDataEncryption: success');
                                callback(null, result);
                            } else {
                                log.error('sqldb cmd-poll: async.waterfall/setTransparentDataEncryption, unexpected error: tdeResult: %j', tdeResult);
                                callback(Error(tdeResult.body.message));
                            }
                        });
                    } else {
                        callback(null, result);
                    }
                }
            ], function (err, result) {
                log.debug('sqldb cmd-poll: async.waterfall/final callback: result: %j', result);
                next(err, result);
            });
        }
    };

};

module.exports = sqldbPoll;
