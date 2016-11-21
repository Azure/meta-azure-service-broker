/* jshint camelcase: false */
/* jshint newcap: false */

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

};

module.exports = cachePoll;
