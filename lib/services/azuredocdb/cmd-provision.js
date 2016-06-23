/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');

var docDbProvision = function(log, params) {

    log.muteOnly('debug');

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};

    var resourceGroupName = reqParams.resourceGroup || '';
    var docDbName = reqParams.docDbName || '';
    
    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.provision = function(docDb, resourceGroup, next) {
        
        var groupParameters = {
            location: location
        };

        async.waterfall([
            function(callback) {
                resourceGroup.checkExistence(resourceGroupName, function(err, checkExistenceResult, req, res) {
                    if (err) {
                        log.error('DocumentDb, resourceGroup.checkExistence, err: %j', err);
                        return callback(err);
                    } else {
                        callback(err, checkExistenceResult);
                    }
                });
            },
            function(checkExistenceResult, callback) {
                if (checkExistenceResult === false) {
                    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function(err, createRGResult, req, res) {
                        if (err) {
                            log.error('DocumentDb, resourceGroup.createOrUpdate, err: %j', err);
                            return callback(err);
                        } else {
                            callback(err, createRGResult);
                        }
                    });
                } else {
                    callback(null, undefined);
                }
            },
            function(createRGResult, callback) {
                log.debug('DocDb, docDb.provision, resourceGroupName: %j', resourceGroupName);
                log.debug('DocDb, docDb.provision, docDbName: %j', docDbName);
                docDb.provision(docDbName, function(err, result) {
                    log.debug('DocDb, docDb.provision, result: %j', result);
                    if (err) {
                        log.error('DocDb, docDb.provision, err: %j', err);
                        return callback(err);
                    } else {
                        callback(err, result);
                    }
                });    
            }
        ], function(err, result){
            next(err, result);
        });        
    };

    //  Validators

    this.locationIsCorrect = function() {
        var loc = reqParams.parameters.location.toLowerCase();
        var regions = ['westus', 'eastus', 'southcentralus', 'centralus', 'northcentralus', 'eastus2', 'northeurope', 'westeurope', 'southeastasia', 'eastasia', 'japanwest', 'japaneast', 'brazilsouth', 'australiasoutheast', 'australiaeast', 'centralindia', 'southindia', 'westindia'];
        if (_.indexOf(regions, loc) != -1) return true;

        log.error('docDb Provision: Location is not correct');
        return false;
    };

    this.instanceIdWasProvided = function() {
        if (_.isString(instanceId)) {
            if (instanceId.length !== 0) return true;
        }

        log.error('docDb Provision: instanceId was not provided.');
        return false;
    };

    this.resourceGroupWasProvided = function() {
        if (_.isString(resourceGroupName)) {
            if (resourceGroupName.length !== 0) return true;
        }

        log.error('docDb Provision: Resource Group name was not provided.  Did you supply the parameters file?');
        return false;
    };

    this.allValidatorsSucceed = function() {
        return this.instanceIdWasProvided() && 
            this.resourceGroupWasProvided();
            // && this.locationIsCorrect();
    };

};

module.exports = docDbProvision;