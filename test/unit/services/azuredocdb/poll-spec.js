/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuredocdb/cmd-poll');
var azure = require('../helpers').azure;
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var msRestRequest = require('../../../../lib/common/msRestRequest');
var request = require('request');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
docDbClient.initialize(azure);

describe('DocumentDb - Provision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: {
        'resourceGroupName': 'myRG',
        'docDbAccountName': 'myaccount'
      },
      last_operation: 'provision'
    };
    
    sinon.stub(request, 'post').yields(null, {statusCode: 201});
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Succeeded","documentEndpoint":"fakeendpoint"}}');
    
    msRestRequest.POST = sinon.stub();
    msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
      .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key"}');
  });
    
  after(function() {
    request.post.restore();
    mockingHelper.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    it('should output state = succeeded, if docdb account is created', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});

describe('DocumentDb - Provision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'docDbAccountName': 'myaccount' },
      last_operation: 'provision'
    };
    
    sinon.stub(request, 'post').yields(null, {statusCode: 201});
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
      .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Creating"}}');
      
    msRestRequest.POST = sinon.stub();
    msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
      .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key"}');
  });
    
  after(function() {
    request.post.restore();
    mockingHelper.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    
    it('should output state = in progress, if docdb account is creating', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
    });
  });
});

describe('DocumentDb - Deprovision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'docDbAccountName': 'myaccount' },
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
    it('should output state = in progress, if docdb account is being deleting', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
    });
  });
});

describe('DocumentDb - Deprovision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'docDbAccountName': 'myaccount' },
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
    
    it('should output state = succeeded, if docdb account is deleted', function(done) {
      var cp = new cmdPoll(validParams);
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});