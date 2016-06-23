/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuredocdb/cmd-provision');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');

var log = logule.init(module, 'DocumentDb-Tests');

var azure = {
    environment: 'AzureCloud',
    subscription_id: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
    tenant_id: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
    client_id: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
    client_secret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};

describe('DocumentDb - Provision - PreConditions', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
            parameters: {
                resourceGroup: 'docDbResourceGroup',
                docDbName: 'goliveDocDb',
                parameters : {
                    location: 'westus'
                }
            },
            azure : azure
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

describe('DocumentDb - Provision - PreConditions incorrect', function() {
    var validParams = {};
    var cp;
        
    before(function() { /* no parameters!! */
        invalidParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',            
            azure : azure
        };
        cp = new cmdProvision(log, invalidParams);
    });
    
    describe('Provision should fail if ...', function() {
        it('parameters were not provided', function(done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();        
        });        
    });
});

describe('DocumentDb - Provision - Execution - DocDb that doesn\'t previsouly exist', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
            parameters: {
                resourceGroup: 'docDbResourceGroup',
                docDbName: 'goliveDocDb',
                parameters : {
                    location: 'westus'
                }
            },
            azure : azure,
            provisioning_result: '{\"_self\":\"dbs/a00AAA==/\"}'
        };
        cp = new cmdProvision(log, validParams);
    });
    
    after(function() {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        docDbClient.provision.restore();
    });
    
    describe('Provision operation outcomes should be...', function() {
        it('should output _self = dbs/a00AAA==/', function(done) {
            
            sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
            sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, {provisioningState: 'Succeeded'});
            sinon.stub(docDbClient, 'provision').yields(null, {_self : 'dbs/a00AAA==/'});
            cp.provision(docDbClient, resourceGroupClient, function(err, result) {
                should.not.exist(err);
                (result._self).should.equal('dbs/a00AAA==/');
                done();        
            });
            
        });
    });
});
