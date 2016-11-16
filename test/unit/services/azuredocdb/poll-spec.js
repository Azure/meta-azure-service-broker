/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuredocdb/cmd-poll');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'DocumentDb-Tests');

describe('DocumentDb - Provision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }',
      last_operation: "provision"
    };
    sinon.stub(docDbClient, 'getToken').yields(null);
    sinon.stub(docDbClient, 'getAccountKey').yields(null);
    sinon.stub(docDbClient, 'createDocDbDatabase').yields(null, "docdbmasterkey", {id: "abc", _self: "abc"});
  });
    
  after(function() {
    docDbClient.getToken.restore();
    docDbClient.getAccountKey.restore();
    docDbClient.createDocDbDatabase.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    it('should output state = succeeded, if docdb account is created', function(done) {
      var cp = new cmdPoll(log, validParams);
      sinon.stub(docDbClient, 'getDocDbAccount').yields(null, {properties: {provisioningState: "Succeeded"}});
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
      docDbClient.getDocDbAccount.restore();
    });
    
    it('should output state = in progress, if docdb account is creating', function(done) {
      var cp = new cmdPoll(log, validParams);
      sinon.stub(docDbClient, 'getDocDbAccount').yields(null, {properties: {provisioningState: "Creating"}});
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
      docDbClient.getDocDbAccount.restore();
    });
  });
});

describe('DocumentDb - Deprovision-Poll - Execution', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }',
      last_operation: "deprovision"
    };
  });
    
  describe('Poll operation outcomes should be...', function() {
    it('should output state = in progress, if docdb account is being deleting', function(done) {
      var cp = new cmdPoll(log, validParams);
      sinon.stub(docDbClient, 'getDocDbAccount').yields(null, {properties: {provisioningState: "Deleting"}});
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('in progress');
        done();
      });
      docDbClient.getDocDbAccount.restore();
    });
    
    it('should output state = succeeded, if docdb account is deleted', function(done) {
      var cp = new cmdPoll(log, validParams);
      var e = new Error();
      e.statusCode = 404;
      sinon.stub(docDbClient, 'getDocDbAccount').yields(e);
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();
      });
      docDbClient.getDocDbAccount.restore();
    });
  });
});
