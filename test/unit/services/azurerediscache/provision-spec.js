/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azurerediscache/cmd-provision');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');
  
var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
redisClient.initialize(azure);

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
        cp = new cmdProvision(validParams);
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
        
        validParams.parameters.parameters.sku = {
          name: 'Standard',
          family: 'C',
          capacity: 0
        };
        cp = new cmdProvision(validParams);
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
        
        validParams.parameters.parameters.sku = {
          name: 'Premium',
          family: 'P',
          capacity: 1
        };
        cp = new cmdProvision(validParams);
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
        cp = new cmdProvision(validParams);
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
            provisioning_result: {'provisioningState':'Creating'}
        };
        cp = new cmdProvision(validParams);
        
        msRestRequest.PUT = sinon.stub();
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/redisResourceGroup')
          .yields(null, {statusCode: 200});

        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheSC')
          .yields(null, {statusCode: 404});

        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheSC')
          .yields(null, {statusCode: 201}, {properties: {provisioningState : 'Creating'}});
    });
    
    after(function() {
        mockingHelper.restore();
    });
    
    describe('Provision operation outcomes should be...', function() {
        it('should output provisioningState = Creating', function(done) {
            cp.provision(redisClient, function(err, result) {
                should.not.exist(err);
                (result.provisioningState).should.equal('Creating');
                done();
            });
            
        });
    });
});
