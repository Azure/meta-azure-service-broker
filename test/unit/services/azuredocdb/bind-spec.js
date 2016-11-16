/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdBind = require('../../../../lib/services/azuredocdb/cmd-bind');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'DocumentDb-Tests');

describe('DocumentDb - Bind', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }'
    };
    sinon.stub(docDbClient, 'getToken').yields(null);
  });
    
  after(function() {
    docDbClient.getToken.restore();
  });
    
  describe('When account key is retrieved from Azure successfully', function() {
    before(function() {
      sinon.stub(docDbClient, 'getAccountKey').yields(null, 'fake-master-key');
    });
      
    after(function() {
      docDbClient.getAccountKey.restore();
    });
    
    it('Bind operation should return credentials', function(done) {
      var cp = new cmdBind(log, validParams);
      cp.bind(docDbClient, function(err, masterKey) {
        should.not.exist(err);
        masterKey.should.equal('fake-master-key');
        done();
      });
    });
  });

  describe('When account key can not be retrieved from Azure', function() {
    before(function() {
      sinon.stub(docDbClient, 'getAccountKey').yields(new Error());
    });
      
    after(function() {
      docDbClient.getAccountKey.restore();
    });
    
    it('Bind operation should get an error and do not return credentials', function(done) {
      var cp = new cmdBind(log, validParams);
      cp.bind(docDbClient, function(err, masterKey) {
        should.exist(err);
        should.not.exist(masterKey);
        done();
      });
    });
  });
});
