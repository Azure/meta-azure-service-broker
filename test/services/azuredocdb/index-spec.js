/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var uuid = require('node-uuid');
var common = require('../../../lib/common');
var service = require('../../../lib/services/azuredocdb/service.json');
var handlers = require('../../../lib/services/azuredocdb/index');
var docDbClient = require('../../../lib/services/azuredocdb/client');
var resourceGroupClient = require('../../../lib/common/resourceGroup-client');

var azure = common.getCredentialsAndSubscriptionId();
var log = logule.init(module, 'DocumentDb-Tests');
var generatedValidInstanceId = uuid.v4();
var provisioningResult = '{"id":"eDocDb","_rid":"77UyAA==","_self":"dbs/77UyAA==/","_etag":"00000700-0000-0000-0000-5706ce870000","_ts":1460063879,"_colls":"colls/","_users":"users/"}';

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
                docDbName: 'eDocDb',
                parameters: {
                    location:'eastus',
                }
            }
        }
    });
    
    after(function() {
        docDbClient.provision.restore();
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
    });
    
    describe('Provision operation should succeed', function() {        
        it('should not return an error and statusCode should be 202', function(done) {

            sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
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
                docDbName: 'eDocDb',
                parameters: {
                    location:'eastus',
                }
            }
        }
    });
    
    after(function() {
        docDbClient.poll.restore();
    });
    
    describe('Poll operation should succeed', function() {        
        it('should not return an error and _self should be dbs/77UyAA==/', function(done) {
            sinon.stub(docDbClient, 'poll').yields(null, JSON.parse(provisioningResult));
            handlers.poll(log, validParams, function(err, reply, result) {
                should.not.exist(err);
                result._self.should.equal('dbs/77UyAA==/');
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
            parameters: {}
        }
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
            provisioning_result: provisioningResult
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

