/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../../lib/common');
var azureservicebus = require('../../../../lib/services/azureservicebus/');
var utils = require('../../../../lib/services/azureservicebus/utils');

var log = logule.init(module, 'ServiceBus-Mocha');

describe('ServiceBus', function() {

  describe('Polling', function() {

    var validParams = {};

    before(function() {
      validParams = {
        instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
        last_operation: 'provision',
        provisioning_result: '{\"resourceGroupName\":\"cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5\",\"namespaceName\":\"cfa6c5953cf5b211e5a5b700\"}',
        azure: common.getCredentialsAndSubscriptionId(),
      };
      utils.init = sinon.stub();
      sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
    });

    after(function() {
        utils.getToken.restore();
    });

    describe('When the provisioning state is Succeeded', function() {

      before(function() {
        sinon.stub(utils, 'getNamespace').yields(null, 'Succeeded');
      });

      after(function() {
        utils.getNamespace.restore();
      });

      it('should return the state: succeeded', function(done) {
        azureservicebus.poll(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the namespace, state: Succeeded',
              state: 'succeeded'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Creating', function() {

      before(function() {
        sinon.stub(utils, 'getNamespace').yields(null, 'Creating');
      });

      after(function() {
        utils.getNamespace.restore();
      });

      it('should return the state: in progress', function(done) {
        azureservicebus.poll(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the namespace, state: Creating',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Activating', function() {

      before(function() {
        sinon.stub(utils, 'getNamespace').yields(null, 'Activating');
      });

      after(function() {
        utils.getNamespace.restore();
      });

      it('should return the state: in progress', function(done) {
        azureservicebus.poll(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the namespace, state: Activating',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Enabling', function() {

      before(function() {
        sinon.stub(utils, 'getNamespace').yields(null, 'Enabling');
      });

      after(function() {
        utils.getNamespace.restore();
      });

      it('should return the state: in progress', function(done) {
        azureservicebus.poll(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the namespace, state: Enabling',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});
