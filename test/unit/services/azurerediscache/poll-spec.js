/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: curl http://localhost:5001/v2/service_instances/62cb3099-a468-42f0-b2c2-110fe3d86611/last_operation -u demouser:demopassword -H "X-Broker-API-Version: 2.8" -H "Content-Type: application/json" -v
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azurerediscache/cmd-poll');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'RedisCache-Mocha');
  
describe('RedisCache - Provision-Poll - Execution - Cache that exists', function() {
    var validParams;
        
    before(function() {
        validParams = {
            instance_id: 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters: {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC'
            },
            provisioning_result: '{\"provisioningState\":\"Creating\"}',
            last_operation: "provision",
            azure: azure
        };
        sinon.stub(redisClient, 'poll').yields(null, {provisioningState : 'Succeeded'});
    });
    
    after(function() {
        redisClient.poll.restore();
    });
    
    describe('Poll operation outcomes should be...', function() {
        it('should output provisioningState = Succeeded', function(done) {
            var cp = new cmdPoll(log, validParams);
            cp.poll(redisClient, function(err, result) {
                should.not.exist(err);
                result.statusCode.should.equal(200);
                done();
            });
            
        });
    });
});

describe('RedisCache - Provision-Poll - Execution - Cache is creating', function() {
    var validParams;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC'
            },
            provisioning_result: '{\"provisioningState\":\"Creating\"}',
            last_operation : "provision",
            azure: azure
        };
        sinon.stub(redisClient, 'poll').yields(null, {provisioningState : 'Creating'});
    });
    
    after(function() {
        redisClient.poll.restore();
    });
    
    describe('Poll operation outcomes should be...', function() {
        it('should output provisioningState = Succeeded', function(done) {
            var cp = new cmdPoll(log, validParams);
            cp.poll(redisClient, function(err, result) {
                should.not.exist(err);
                result.statusCode.should.equal(200);
                done();
            });
        });
    });
});

describe('RedisCache - Deprovision-Poll - Execution - Cache that unexists', function() {
    var validParams;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC'
            },
            provisioning_result: '{\"provisioningState\":\"Creating\"}',
            last_operation : "deprovision",
            azure: azure
        };
        var e = new Error();
        e.statusCode = 404;
        sinon.stub(redisClient, 'poll').yields(e);
    });
    
    after(function() {
        redisClient.poll.restore();
    });
    
    describe('Poll operation outcomes should be...', function() {
        it('should output provisioningState = Succeeded', function(done) {
            var cp = new cmdPoll(log, validParams);
            cp.poll(redisClient, function(err, result) {
                should.not.exist(err);
                result.statusCode.should.equal(200);
                done();
            });
        });
    });
});
