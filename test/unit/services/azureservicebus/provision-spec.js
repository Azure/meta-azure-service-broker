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

  describe('Provisioning', function() {

    before(function() {
      utils.init = sinon.stub();
    });

    describe('When no specific parameters are provided', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: common.getCredentialsAndSubscriptionId(),
        };
        sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
        sinon.stub(utils, 'createResourceGroup').yields(null, 'fake-access-token');
        sinon.stub(utils, 'createNamespace').yields(null, 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5', 'cfe77a25d2-f58c-11e5-b933-000d3a80e5f5');
      });

      after(function() {
        utils.getToken.restore();
        utils.createResourceGroup.restore();
        utils.createNamespace.restore();
      });

      it('should return missing parameter error', function(done) {
        azureservicebus.provision(log, validParams, function(
          err, reply, result) {
          err.should.have.property('message',
            'resource_group_name in configuration needed.');
          done();
        });
      });
    });

    describe('When specific parameters are provided and but incompleted',
      function() {
        var validParams = {};

        before(function() {
          validParams = {
            instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
            azure: common.getCredentialsAndSubscriptionId(),
            parameters: {
              resource_group_name: 'zhongyisbtest',
              namespace_name: 'zhongyisb',
              location: 'westus',
              messaging_tier: 'Standard'
            }
          };
          sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
          sinon.stub(utils, 'createResourceGroup').yields(null, 'fake-access-token');
          sinon.stub(utils, 'createNamespace').yields(null, 'zhongyisbtest', 'zhongyisb');
        });

        after(function() {
          utils.getToken.restore();
          utils.createResourceGroup.restore();
          utils.createNamespace.restore();
        });

        it('should return missing parameter error', function(done) {
          azureservicebus.provision(log, validParams, function(
            err, reply, result) {
            err.should.have.property('message',
              'type in configuration needed.');
            done();
          });
        });
      });

    describe('When specific parameters are provided and valid',
      function() {
        var validParams = {};

        before(function() {
          validParams = {
            instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
            azure: common.getCredentialsAndSubscriptionId(),
            parameters: {
              resource_group_name: 'zhongyisbtest',
              namespace_name: 'zhongyisb',
              location: 'westus',
              type: 'Messaging',
              messaging_tier: 'Standard'
            }
          };
          sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
          sinon.stub(utils, 'createResourceGroup').yields(null, 'fake-access-token');
          sinon.stub(utils, 'createNamespace').yields(null, 'zhongyisbtest', 'zhongyisb');
        });

        after(function() {
          utils.getToken.restore();
          utils.createResourceGroup.restore();
          utils.createNamespace.restore();
        });

        it('should create the namespace', function(done) {
          azureservicebus.provision(log, validParams, function(
            err, reply, result) {
            should.not.exist(err);
            var replyExpected = {
              statusCode: 202,
              code: 'Accepted',
              value: {}
            };
            reply.should.eql(replyExpected);
            var resultExpected = {
                'resourceGroupName': 'zhongyisbtest',
                'namespaceName': 'zhongyisb',
            };
            result.should.eql(resultExpected);

            done();
          });
        });
      });

  });
});
