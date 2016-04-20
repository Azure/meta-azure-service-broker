/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');

var cachePoll = function(log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';

    var resourceGroup = reqParams.resourceGroup || '';
    var cacheName = reqParams.cacheName || '';

    this.poll = function(redis, next) {

        redis.poll(resourceGroup, cacheName, function(err, result) {
            var reply = {
                state: '',
                description: '',
            };
            if (lastoperation === 'provision') {
                if (!err) {
                    var state = result.provisioningState;
                    if (state === 'Creating') {
                        reply.state = 'in progress';
                        reply.description = 'Creating the cache, state: ' + state;
                    } else if (state === 'Succeeded') {
                        reply.state = 'succeeded';
                        reply.description = 'Created the cache, state: ' + state;
                    }
                } else {
                    next(err);
                }
            } else if (lastoperation === 'deprovision') {
                if (!err) {
                    reply.state = 'in progress';
                    reply.description = 'Deleting the cache';
                } else if (err.statusCode == 404) {
                    reply.state = 'succeeded';
                    reply.description = 'Deleted the cache.';
                } else {
                    next(err);
                }
            }
            reply = {
                statusCode: 200,
                code: 'OK',
                value: reply,
            };
            next(null, reply);
        });
    };

    //  Validators

    this.instanceIdWasProvided = function() {
        if (_.isString(instanceId)) {
            if (instanceId.length !== 0) return true;
        }

        log.error('Redis Cache Poll: instanceId was not provided.');
        return false;
    };

    this.resourceGroupWasProvided = function() {
        if (_.isString(resourceGroup)) {
            if (resourceGroup.length !== 0) return true;
        }

        log.error('Redis Cache Poll: Resource Group name was not provided.');
        return false;
    };

    this.cacheNameWasProvided = function() {
        if (_.isString(cacheName)) {
            if (cacheName.length !== 0) return true;
        }

        log.error('Redis Cache Poll: Cache name was not provided.');
        return false;
    };

    this.allValidatorsSucceed = function() {
        return this.instanceIdWasProvided() &&
            this.resourceGroupWasProvided() &&
            this.cacheNameWasProvided();
    };

};

module.exports = cachePoll;
