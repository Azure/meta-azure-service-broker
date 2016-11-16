/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var uuid = require('node-uuid');
var service = require('../../../../lib/services/azuredocdb/service.json');
var handlers = require('../../../../lib/services/azuredocdb/index');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');

var azure = require('../helpers').azure;

var log = logule.init(module, 'DocumentDb-Tests');
var generatedValidInstanceId = uuid.v4();
var provisioningResult = '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount", "database": {"id": "abc", "_self": "abc"} }';

log.muteOnly('debug');

describe('DocumentDb - Index - Provision', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            parameters: {
                resourceGroup: 'docDbResourceGroup',
                docDbAccountName: 'eDocDbAccount',
                docDbName: 'eDocDb',
                location:'eastus'
            }
        };
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null);
        sinon.stub(docDbClient, 'checkDocDbAccountExistence').yields(null);
        sinon.stub(docDbClient, 'createDocDbAccount').yields(null);
        
    });
    
    after(function() {
        resourceGroupClient.createOrUpdate.restore();
        docDbClient.checkDocDbAccountExistence.restore();
        docDbClient.createDocDbAccount.restore();
    });
    
    describe('Provision operation should succeed', function() {        
        it('should not return an error and statusCode should be 202', function(done) {
            handlers.provision(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(202);
                done();
            });
                        
        });
    });
});

describe('DocumentDb - Index - Poll', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            last_operation: 'provision',
            provisioning_result: provisioningResult,
            parameters: {
                resourceGroup: 'docDbResourceGroup',
                docDbAccountName: 'eDocDbAccount',
                docDbName: 'eDocDb',
                location:'eastus'
            }
        };
        sinon.stub(docDbClient, 'getDocDbAccount').yields(null, {properties: {provisioningState: "Succeeded"}});
        sinon.stub(docDbClient, 'getToken').yields(null);
        sinon.stub(docDbClient, 'getAccountKey').yields(null);
        sinon.stub(docDbClient, 'createDocDbDatabase').yields(null);
    });
    
    after(function() {
        docDbClient.getDocDbAccount.restore();
        docDbClient.getToken.restore();
        docDbClient.getAccountKey.restore();
        docDbClient.createDocDbDatabase.restore();
    });
    
    describe('Poll operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.poll(log, validParams, function(err, lastOperatoin, reply, result) {
                should.not.exist(err);
                lastOperatoin.should.equal('provision');
                done();
            });
                        
        });
    });
});

describe('DocumentDb - Index - Bind', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            provisioning_result: provisioningResult,
            parameters: {
              resourceGroupName: "myRG",
              docDbAccountName: 'eDocDbAccount',
              docDbName: 'eDocDb',
              location:'eastus'
            }
        };
        sinon.stub(docDbClient, 'getToken').yields(null);
        sinon.stub(docDbClient, 'getAccountKey').yields(null);
    });

    after(function() {
        docDbClient.getToken.restore();
        docDbClient.getAccountKey.restore();
    });

    describe('Bind operation should succeed', function() {        
        it('should not return an error and statusCode should be 201', function(done) {
            handlers.bind(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(201);
                done();
            });
                        
        });
    });
});

describe('DocumentDb - Index - Unbind', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            provisioning_result: provisioningResult,
            binding_result: {}
        };
    });
    
    describe('Unbind operation should succeed', function() {        
        it('should not return an error and statusCode should be 200', function(done) {
            handlers.unbind(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(200);
                done();
            });
                        
        });
    });
});

describe('DocumentDb - Index - De-provision', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            provisioning_result: provisioningResult,
            parameters: {
              resourceGroupName: "myRG",
              docDbAccountName: 'eDocDbAccount',
              docDbName: 'eDocDb',
              location:'eastus'
            }
        };
    });
    
    after(function() {
        docDbClient.deleteDocDbAccount.restore();
    });
    
    describe('De-provision operation should succeed', function() {        
        it('should not return an error, statusCode should be 202.', function(done) {

            sinon.stub(docDbClient, 'deleteDocDbAccount').yields(null);
            handlers.deprovision(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(202);
                done();
            });
                        
        });
    });
});


