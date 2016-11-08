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
var cmdProvision = require('../../../../lib/services/azurerediscache/cmd-provision');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');
var azure = require('../helpers').azure;
 
var log = logule.init(module, 'RedisCache-Mocha');

describe('RedisCache - Provision - PreConditions', function() {
    var validParams = {};
    var cp;
    
    describe('Provision should succeed if ...', function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            parameters : {
                resourceGroup: 'redisResourceGroup',
                cacheName: 'C0CacheNC',
                parameters: {
                    location: 'northcentralus',
                    enableNonSslPort: false,
                    sku: {
                        name: 'Basic',
                        family: 'C',
                        capacity: 0
                    }
                }
            },
            azure : azure
        };
        cp = new cmdProvision(log, validParams);
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
        
        validParams.parameters.parameters.sku = {
          name: 'Standard',
          family: 'C',
          capacity: 0
        };
        cp = new cmdProvision(log, validParams);
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
        
        validParams.parameters.parameters.sku = {
          name: 'Premium',
          family: 'P',
          capacity: 1
        };
        cp = new cmdProvision(log, validParams);
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });
});

describe('RedisCache - Provision - PreConditions incorrect', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {  /* missing parameters!! */
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',            
            azure : azure
        };
        cp = new cmdProvision(log, validParams);
    });
    
    describe('Provision should fail if ...', function() {
        it('parameters are missing.', function(done) {
            (cp.allValidatorsSucceed()).should.equal(false);
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
            azure : azure,
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };
        cp = new cmdProvision(log, validParams);
    });
    
    after(function() {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        redisClient.provision.restore();
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
