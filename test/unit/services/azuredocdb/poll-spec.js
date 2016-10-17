/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuredocdb/cmd-poll');
var docDbClient = require('../../../../lib/services/azuredocdb/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'DocumentDb-Tests');

describe('DocumentDb - Poll - PreConditions', function() {
  var validParams;
        
  before(function() {
       
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }'
    };
  });
    
});

describe('DocumentDb - Poll - Execution - docDb that exists', function() {
  var validParams;
        
  before(function() {
    validParams = {
      instance_id: '2e201389-35ff-4b89-9148-5c08c7325dc8',
      provisioning_result: '{ "resourceGroupName": "myRG", "docDbAccountName": "myaccount" }',
      last_operation: "provision"
    };
  });
    
  after(function() {
    docDbClient.poll.restore();
  });
    
  describe('Poll operation outcomes should be...', function() {
    it('should output state = succeeded', function(done) {
      var cp = new cmdPoll(log, validParams);
            
      sinon.stub(docDbClient, 'poll').yields(null, 'Succeeded');
      cp.poll(docDbClient, function(err, reply) {
        should.not.exist(err);
        reply.value.state.should.equal('succeeded');
        done();        
      });
            
    });
  });
});

