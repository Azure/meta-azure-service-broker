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

var azure = {
    environment: 'AzureCloud',
    subscription_id: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
    tenant_id: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
    client_id: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
    client_secret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};
  
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
            azure : azure,
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
