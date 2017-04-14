/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var uuid = require('uuid');
var service = require('../../../../lib/services/azuredocdb/service.json');
var handlers = require('../../../../lib/services/azuredocdb/index');
var msRestRequest = require('../../../../lib/common/msRestRequest');
var request = require('request');

var azure = require('../helpers').azure;

var generatedValidInstanceId = uuid.v4();

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

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
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/docDbResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/eDocDbAccount')
          .yields(null, {statusCode: 404});
          
        msRestRequest.PUT = sinon.stub();
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/docDbResourceGroup')
          .yields(null, {statusCode: 200});
          
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/docDbResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/eDocDbAccount')
          .yields(null, {statusCode: 200});
    });
    
    after(function() {
        mockingHelper.restore();
    });
    
    describe('Provision operation should succeed', function() {        
        it('should not return an error and statusCode should be 202', function(done) {
            handlers.provision(validParams, function(err, reply, result) {
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
            provisioning_result: {
                'resourceGroupName': 'myRG',
                'docDbAccountName': 'myaccount',
                'database':
                {
                    'id': 'abc',
                    '_self': 'abc'
                }
            },
            parameters: {
                resourceGroup: 'docDbResourceGroup',
                docDbAccountName: 'eDocDbAccount',
                docDbName: 'eDocDb',
                location:'eastus',

            }
        };
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Succeeded","documentEndpoint":"fakeendpoint"}}');

        msRestRequest.POST = sinon.stub();
        msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
          .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key"}');

        sinon.stub(request, 'post').yields(null, {statusCode: 201});

    });
    
    after(function() {
        mockingHelper.restore();
        request.post.restore();
    });
    
    describe('Poll operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.poll(validParams, function(err, lastOperatoin, reply, result) {
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
            provisioning_result: {
                'resourceGroupName': 'myRG',
                'docDbAccountName': 'myaccount',
                'database':
                {
                    'id': 'abc',
                    '_self': 'abc'
                }
            },
            parameters: {
              resourceGroupName: 'myRG',
              docDbAccountName: 'eDocDbAccount',
              docDbName: 'eDocDb',
              location:'eastus'
            }
        };


        
        msRestRequest.POST = sinon.stub();
        msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
          .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key","documentEndpoint":"fakeendpoint"}');
    });

    after(function() {
        mockingHelper.restore();
    });

    describe('Bind operation should succeed', function() {        
        it('should not return an error and statusCode should be 201', function(done) {
            handlers.bind(validParams, function(err, reply, result) {
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
            provisioning_result: {
                'resourceGroupName': 'myRG',
                'docDbAccountName': 'myaccount',
                'database':
                {
                    'id': 'abc',
                    '_self': 'abc'
                }
            },
            binding_result: {}
        };
    });
    
    describe('Unbind operation should succeed', function() {        
        it('should not return an error and statusCode should be 200', function(done) {
            handlers.unbind(validParams, function(err, reply, result) {
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
            provisioning_result: {
                'resourceGroupName': 'myRG',
                'docDbAccountName': 'myaccount',
                'database':
                {
                    'id': 'abc',
                    '_self': 'abc'
                }
            },
            parameters: {
                resourceGroupName: 'myRG',
                docDbAccountName: 'eDocDbAccount',
                docDbName: 'eDocDb',
                location: 'eastus'
            }
        };
        
        msRestRequest.DELETE = sinon.stub();
        msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
          .yields(null, {statusCode: 202});
    });
    
    after(function() {
        mockingHelper.restore();
    });
    
    describe('De-provision operation should succeed', function() {        
        it('should not return an error, statusCode should be 202.', function(done) {
            handlers.deprovision(validParams, function(err, reply, result) {
                should.not.exist(err);
                reply.statusCode.should.equal(202);
                done();
            });
                        
        });
    });
});


