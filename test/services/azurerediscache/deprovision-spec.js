/*
    test: curl "http://localhost:5001/v2/service_instances/62cb3099-a468-42f0-b2c2-110fe3d86611?service_id=0346088a-d4b2-4478-aa32-f18e295ec1d9&plan_id=1a34c5eb-3cf0-45dc-bb34-94a69dafc992" -u demouser:demopassword -X DELETE -H "X-Broker-API-Version: 2.8" -v
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../lib/common');
var cmdDeprovision = require('../../../lib/services/azurerediscache/cmd-deprovision');
var redisClient = require('../../../lib/services/azurerediscache/redis-client');

var log = logule.init(module, 'RedisCache-Mocha');

describe('RedisCache - Deprovision - PreConditions', function() {
    var cp;
        
    before(function() {
        var validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            provisioning_result: '{\"id\":\"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheNC\",\"name\":\"C0CacheNC\"}'
        };
        validParams.azure = common.getCredentialsAndSubscriptionId();
        cp = new cmdDeprovision(log, validParams);
    });
    
    describe('Deprovision should succeed if ...', function() {
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();        
        });        
    });
});

describe('RedisCache - Deprovision - Execution', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            provisioning_result: '{\"id\":\"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheNC\",\"name\":\"C0CacheNC\"}'
        };
        validParams.azure = common.getCredentialsAndSubscriptionId();
        cp = new cmdDeprovision(log, validParams);
    });
    
    describe('Deprovision operation outcomes should be...', function() {
        it('should output err & result null', function(done) {
            
            sinon.stub(redisClient, 'deprovision').yields(null, null);
            cp.deprovision(redisClient, function(err, result) {
                should.not.exist(err);
                should.not.exist(result);
                done();
            });
            
        });
    });
});    