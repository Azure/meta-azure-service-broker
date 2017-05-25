/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azurecosmosdb/cmd-poll');
var azure = require('../helpers').azure;
var cosmosDbClient = require('../../../../lib/services/azurecosmosdb/client');
var msRestRequest = require('../../../../lib/common/msRestRequest');
var request = require('request');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
cosmosDbClient.initialize(azure);

describe('CosmosDb - Provision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: {
        'resourceGroupName': 'myRG',
        'cosmosDbAccountName': 'myaccount'
      },
      last_operation: 'provision'
    };
    
    sinon.stub(request, 'post').yields(null, {statusCode: 201});
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Succeeded","documentEndpoint":"fakeendpoint"}}');
    
    msRestRequest.POST = sinon.stub();
    msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
      .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key","primaryReadonlyMasterKey":"fake-readonly-master-key"}');
  });
    
  after(function() {
    request.post.restore();
    mockingHelper.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    it('should output state = succeeded, if cosmosdb account is created', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(cosmosDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});

describe('CosmosDb - Provision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'cosmosDbAccountName': 'myaccount' },
      last_operation: 'provision'
    };
    
    sinon.stub(request, 'post').yields(null, {statusCode: 201});
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Creating"}}');
      
    msRestRequest.POST = sinon.stub();
    msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
      .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key","primaryReadonlyMasterKey":"fake-readonly-master-key"}');
  });
    
  after(function() {
    request.post.restore();
    mockingHelper.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    
    it('should output state = in progress, if cosmosdb account is creating', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(cosmosDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
    });
  });
});

describe('CosmosDb - Deprovision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'cosmosDbAccountName': 'myaccount' },
      last_operation: 'deprovision'
    };
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Deleting"}}');
  });
  
  after(function() {
    mockingHelper.restore();
  });
  
  describe('Poll operation outcomes should be...', function() {
    it('should output state = in progress, if cosmosdb account is being deleting', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(cosmosDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
    });
  });
});

describe('CosmosDb - Deprovision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'cosmosDbAccountName': 'myaccount' },
      last_operation: 'deprovision'
    };
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 404});
  });
  
  after(function() {
    mockingHelper.restore();
  });
  
  describe('Poll operation outcomes should be...', function() {
    
    it('should output state = succeeded, if cosmosdb account is deleted', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(cosmosDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});