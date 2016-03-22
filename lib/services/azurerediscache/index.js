/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var Config = require('./redis-service');
var cmdPoll = require('./cmd-poll');
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var redisClient = require('./redis-client');
var resourceGroupClient = require('./resourceGroup-client');

var Handlers = {};

var Reply = function(statusCode, altStatusCode, altCode) {
    var reply = {};
    switch(statusCode) {
        case 200:
            reply = {
                statusCode: altStatusCode || 200,
                code: altCode || 'Accepted',
                value: {
                    state: 'Succeeded',
                    description: 'Operation was successful.'
                }
            };
            break;

        case 202:
            reply = {
                statusCode: altStatusCode || 202,
                code: altCode || 'Accepted',
                value: {
                    state: 'Succeeded',
                    description: 'Operation was successful.'
                }
            };      
            break;
        
        case 500:
            reply = {
                statusCode: altStatusCode || 500,
                code: altCode || 'InternalServerError',
                value: {
                    state: 'Failed',
                    description: 'Operation failed. Check the log for details.'
                }
            };
            break;                
    }
    return reply;
};

Handlers.catalog = function(log, params, next) {
    var reply = Config;
    next(null, reply);
};

Handlers.provision = function(log, params, next) {

    var cp = new cmdProvision(log, params);

    if (!cp.allValidatorsSucceed()) {
        var reply = Reply(500); reply.value.description = 'Input validators failed.';
        var err = new Error('Validation failed.'); err.code = 500;
        next(err, reply, null);
        return;
    }

    resourceGroupClient.instantiate(params.azure);
    redisClient.instantiate(params.azure);
    cp.provision(redisClient, resourceGroupClient, function(err, result) {
        if (err) {
            var reply = Reply(500, err.statusCode, err.code);
            next(err, reply, result);
        } else {
            next(null, Reply(202), result);
        }
    });
};

Handlers.poll = function(log, params, next) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    
    var cp = new cmdPoll(log, params);
    if (!cp.allValidatorsSucceed()) {
        var reply = Reply(500); reply.value.description = 'Input validators failed.';
        var err = new Error('Validation failed.'); err.code = 500;
        next(err, reply, provisioningResult);
        return;
    }

    redisClient.instantiate(params.azure);
    cp.poll(redisClient, function(err, result) {
        if (err) {
            var reply = Reply(500, err.statusCode, err.code);
            if (err.message === 'NotFound') {
                reply.value.description = 'Named cache could not be found.';
            }
            next(err, reply, provisioningResult);
        } else {
            next(null, Reply(200), provisioningResult);
        }
    });
};

Handlers.deprovision = function(log, params, next) {

    var provisioningResult = JSON.parse(params.provisioning_result);

    var cp = new cmdDeprovision(log, params);
    if (!cp.allValidatorsSucceed()) {
        var reply = Reply(500); reply.value.description = 'Input validators failed.';
        var err = new Error('Validation failed.'); err.code = 500;
        next(err, reply, provisioningResult);
        return;
    }

    redisClient.instantiate(params.azure);
    cp.deprovision(redisClient, function(err, result) {
        if (err) {
            var reply = Reply(500, err.statusCode, err.code);
            next(err, reply, result);
        } else {
            next(null, Reply(200), result);
        }
    });
};

Handlers.bind = function(log, params, next) {

    var provisioningResult = JSON.parse(params.provisioning_result);

    var reply = {};
    reply.credentials = {
        cacheName: provisioningResult.name,
        primaryKey: provisioningResult.accessKeys.primaryKey,
        secondaryKey: provisioningResult.accessKeys.secondaryKey
    };
    next(null, reply, provisioningResult);
};

Handlers.unbind = function(log, params, next) {
    next(null);
};

module.exports = Handlers;
