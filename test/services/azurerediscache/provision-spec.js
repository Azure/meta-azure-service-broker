/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../lib/common');
var cmdProvision = require('../../../lib/services/azurerediscache/cmd-provision');
var redisClient = require('../../../lib/services/azurerediscache/redis-client');
var resourceGroupClient = require('../../../lib/services/azurerediscache/resourceGroup-client');

var log = logule.init(module, 'RedisCache-Mocha');

describe('RedisCache - Provision - PreConditions', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC',
                parameters: {
                    location: 'northcentralus',
                    redisVersion: '3.0',
                    enableNonSslPort: false,
                    sku: {
                        name: 'Basic',
                        family: 'C',
                        capacity: 0
                    }
                }
            },
            azure : common.getCredentialsAndSubscriptionId(),
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };
        cp = new cmdProvision(log, validParams);
    });
    
    describe('Provision should succeed if ...', function() {
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();        
        });        
    });
});

describe('RedisCache - Provision - Execution - Cache that doesn\'t previsouly exist', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheSC',
                parameters: {
                    location: 'southcentralus',
                    redisVersion: '3.0',
                    enableNonSslPort: false,
                    sku: {
                        name: 'Basic',
                        family: 'C',
                        capacity: 0
                    }
                }
            },
            azure : common.getCredentialsAndSubscriptionId(),
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };
        cp = new cmdProvision(log, validParams);
    });
    
    describe('Provision operation outcomes should be...', function() {
        it('should output provisioningState = Creating', function(done) {
            
            sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
            sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, {provisioningState: 'Succeeded'});
            sinon.stub(redisClient, 'provision').yields(null, {provisioningState : 'Creating'});
            cp.provision(redisClient, resourceGroupClient, function(err, result) {
                should.not.exist(err);
                (result.provisioningState).should.equal('Creating');
                done();        
            });
            
        });
    });
});