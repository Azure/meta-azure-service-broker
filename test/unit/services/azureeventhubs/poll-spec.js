/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var azureeventhubs = require('../../../../lib/services/azureeventhubs/');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('EventHubs', function() {

  describe('Polling', function() {

    var validParams = {};

    describe('When the provisioning state is Succeeded', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'provision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Succeeded"}}');
        // create eh entity
        msRestRequest.PUT = sinon.stub();
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700/eventhubs/testeh')
          .yields(null, {statusCode: 200});
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: succeeded', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Created the namespace. Created event hub.',
              state: 'succeeded'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Creating', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'provision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Creating"}}');
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: in progress', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

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
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Activating', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'provision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };

        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Activating"}}');
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: in progress', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

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
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Enabling', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'provision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Enabling"}}');
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: in progress', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

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
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the checkNamespaceStatus in deprovisioning can still get the namespace', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'deprovision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Deleting"}}');
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: in progress', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('deprovision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Deleting the namespace',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });
    
    describe('When the checkNamespaceStatus in deprovisioning can\'t get the namespace', function() {

      before(function() {
        validParams = {
          instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
          last_operation: 'deprovision',
          provisioning_result: {
            'resourceGroupName':'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'namespaceName':'cfa6c5953cf5b211e5a5b700',
            'eventHubName': 'testeh'
          },
          azure: azure,
        };
        var notFoundError = new Error('Namespace not found.');
        notFoundError.statusCode = 404;
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.EventHub/namespaces/cfa6c5953cf5b211e5a5b700')
          .yields(notFoundError);
      });

      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the state: succeeded', function(done) {
        azureeventhubs.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('deprovision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Deleting the namespace',
              state: 'succeeded'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
              namespaceName: 'cfa6c5953cf5b211e5a5b700',
              eventHubName: 'testeh'
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });
  });
});
