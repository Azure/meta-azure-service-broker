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
var provisioningResult = '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }';

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
                docDbAccountName: 'eDocDb',
                location:'eastus'
            }
        }
    });
    
    after(function() {
        docDbClient.provision.restore();
        resourceGroupClient.createOrUpdate.restore();
    });
    
    describe('Provision operation should succeed', function() {        
        it('should not return an error and statusCode should be 202', function(done) {

            sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, {provisioningState: 'Succeeded'});
            sinon.stub(docDbClient, 'provision').yields(null, JSON.parse(provisioningResult));
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
                docDbAccountName: 'eDocDb',
                location:'eastus'
            }
        }
    });
    
    after(function() {
        docDbClient.poll.restore();
    });
    
    describe('Poll operation should succeed', function() {        
        it('should not return an error and _self should be dbs/77UyAA==/', function(done) {
            sinon.stub(docDbClient, 'poll').yields(null, JSON.parse(provisioningResult));
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
              docDbAccountName: "myaccount"
            }
        }
    });
    
    describe('Bind operation should succeed', function() {        
        it('should not return an error and statusCode should be 201', function(done) {
            sinon.stub(docDbClient, 'bind').yields(null, {documentEndpoint: 'abc', masterKey: 'abc'});
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
        }
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
              docDbAccountName: "myaccount"
            }
        }
    });
    
    after(function() {
        docDbClient.deprovision.restore();
    });
    
    describe('De-provision operation should succeed', function() {        
        it('should not return an error, statusCode should be 202.', function(done) {

            sinon.stub(docDbClient, 'deprovision').yields(null, undefined);
            handlers.deprovision(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(202);
                done();
            });
                        
        });
    });
});


