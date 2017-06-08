/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azurecosmosdb/cmd-deprovision');
var cosmosDbClient = require('../../../../lib/services/azurecosmosdb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
cosmosDbClient.initialize(azure);

describe('CosmosDb - Deprovision', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: { 'resourceGroupName': 'myRG', 'cosmosDbAccountName': 'myaccount' }
    };
  });

  describe('When Azure returns HttpStatus.Accepted as 202', function() {
    before(function() {
      msRestRequest.DELETE = sinon.stub();
      msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
        .yields(null, {statusCode: 202});
    });
      
    after(function() {
      mockingHelper.restore();
    });
    
    it('should not get error', function(done) {
      var cp = new cmdDeprovision(validParams);
      cp.deprovision(cosmosDbClient, function(err) {
        done(err);
      });
    });
  });
  
  describe('When the account is not existed and Azure returns HttpStatus.NO_CONTENT as 204', function() {
    before(function() {
      msRestRequest.DELETE = sinon.stub();
      msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/myRG/providers/Microsoft.DocumentDB/databaseAccounts/myaccount')
        .yields(null, {statusCode: 204});
    });
      
    after(function() {
      mockingHelper.restore();
    });
    
    it('should not get error', function(done) {
      var cp = new cmdDeprovision(validParams);
      cp.deprovision(cosmosDbClient, function(err) {
        done(err);
      });
    });
  });
});
