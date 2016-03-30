/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../lib/common');
var cmdProvision = require('../../../lib/services/azuredocdb/cmd-provision');
var docDbClient = require('../../../lib/services/azuredocdb/client');
var resourceGroupClient = require('../../../lib/common/resourceGroup-client');

var log = logule.init(module, 'DocumentDb-Tests');

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
            azure : common.getCredentialsAndSubscriptionId()
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
            azure : common.getCredentialsAndSubscriptionId(),
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