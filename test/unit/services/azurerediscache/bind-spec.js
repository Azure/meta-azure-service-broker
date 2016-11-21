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
var cmdBind = require('../../../../lib/services/azurerediscache/cmd-bind');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'RedisCache-Mocha');
  
describe('RedisCache - Bind', function() {
    var validParams;
    var fakeAccessKeys = {primaryKey: 'fake-primary-key', secondaryKey: 'fake-secondary-key'};

    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC'
            },
            azure: azure
        };
        sinon.stub(redisClient, 'bind').yields(null, fakeAccessKeys);
    });
    
    after(function() {
        redisClient.bind.restore();
    });
    
    describe('When access keys are retrievied from Azure successfully', function() {
        it('should return credentials', function(done) {
            var cp = new cmdBind(log, validParams);
            cp.bind(redisClient, function(err, accessKeys) {
                should.not.exist(err);
                accessKeys.should.eql(fakeAccessKeys);
                done();
            });
        });
    });
});
