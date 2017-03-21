/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var util = require('util');
var cmdProvision = require('../../../../lib/services/azuredocdb/cmd-provision');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
docDbClient.initialize(azure);

describe('DocumentDb - Provision - PreConditions', function() {
  var validParams = {};
  var cp;
        
  before(function() {
    validParams = {
      instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
      parameters: {
        resourceGroup: 'docDbResourceGroup',
        docDbAccountName: 'testDocDbAccount',
        docDbName: 'testDocDb',
        location: 'westus'
      },
      azure : azure
    };
    cp = new cmdProvision(validParams);
  });
    
  describe('Provision should succeed if ...', function() {
    it('verifyParameters returns null', function(done) {
      (cp.verifyParameters() === null).should.equal(true);
      done();
    });        
  });
});

describe('DocumentDb - Provision - PreConditions incorrect', function() {
  var cp;
        
  before(function() { /* no parameters!! */
    var invalidParams = {
      instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',            
      azure : azure
    };
    cp = new cmdProvision(invalidParams);
  });
    
  describe('Provision should fail if ...', function() {
    it('parameters were not provided', function(done) {
      (cp.verifyParameters()).should.equal(util.format('The parameters %j are missing.', ['resourceGroup','docDbAccountName','docDbName','location']));
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
        docDbAccountName: 'testDocDbAccount',
        docDbName: 'testDoc',
        location: 'westus'
      },
      azure : azure,
    };
    cp = new cmdProvision(validParams);
    
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/docDbResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/testDocDbAccount')
      .yields(null, {statusCode: 404});
    
    msRestRequest.PUT = sinon.stub();
    msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/docDbResourceGroup')
      .yields(null, {statusCode: 200});

    msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourcegroups/docDbResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/testDocDbAccount')
      .yields(null, {statusCode: 200});
  });
    
  after(function() {
    mockingHelper.restore();
  });
    
  describe('Provision operation outcomes should be...', function() {
    it('should not exist error', function(done) {
      cp.provision(docDbClient, function(err, result) {
        should.not.exist(err);
        result.should.be.eql({
          resourceGroupName: 'docDbResourceGroup',
          docDbAccountName: 'testDocDbAccount'
        });
        done();
      });
    });
  });
});

