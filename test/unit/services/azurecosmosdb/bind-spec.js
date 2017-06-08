/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdBind = require('../../../../lib/services/azurecosmosdb/cmd-bind');
var cosmosDbClient = require('../../../../lib/services/azurecosmosdb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
cosmosDbClient.initialize(azure);

describe('CosmosDb - Bind', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'cosmosDbAccountName': 'myaccount' }
    };
  });
    
  describe('When account key is retrieved from Azure successfully', function() {
    before(function() {
      msRestRequest.POST = sinon.stub();
      msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
        .yields(null, {statusCode: 200}, '{"primaryMasterKey":"fake-master-key", "primaryReadonlyMasterKey":"fake-readonly-master-key"}');
    });
      
    after(function() {
      mockingHelper.restore();
    });
    
    it('should return credentials', function(done) {
      var cp = new cmdBind(validParams);
      cp.bind(cosmosDbClient, function(err, masterKey, readonlyMasterKey) {
        should.not.exist(err);
        masterKey.should.equal('fake-master-key');
        readonlyMasterKey.should.equal('fake-readonly-master-key');
        done();
      });
    });
  });

  describe('When account key can not be retrieved from Azure', function() {
    before(function() {
      msRestRequest.POST = sinon.stub();
      msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/listKeys')
        .yields(null, {statusCode: 500});
    });
      
    after(function() {
      mockingHelper.restore();
    });
    
    it('should get an error and do not return credentials', function(done) {
      var cp = new cmdBind(validParams);
      cp.bind(cosmosDbClient, function(err, masterKey) {
        should.exist(err);
        should.not.exist(masterKey);
        done();
      });
    });
  });
});
