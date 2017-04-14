/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var azurestorage = require('../../../../lib/services/azurestorage/');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('Storage', function() {

  describe('Polling', function() {

    var validParams = {};

    before(function() {
      validParams = {
        instance_id: 'a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
        last_operation: 'provision',
        provisioning_result: {
          'resourceGroupResult': {
            'resourceGroupName': 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5',
            'groupParameters': {
              'location': 'eastus'
            }
          },
          'storageAccountResult': {
            'storageAccountName': 'cfa6c5953cf5b211e5a5b700',
            'accountParameters': {
              'location': 'eastus',
              'accountType': 'Standard_LRS'
            }
          }
        },
        azure: azure,
      };
    });

    describe('When the provisioning state is Succeeded', function() {

      before(function() {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.Storage/storageAccounts/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Succeeded"}}');
      });

      after(function() {
        mockingHelper.restore();
      });

      it('should return the state: succeeded', function(done) {
        azurestorage.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Created the storage account, state: Succeeded',
              state: 'succeeded'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
            resourceGroupResult: {
              groupParameters: {
                location: 'eastus'
              },
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5'
            },
            storageAccountResult: {
              accountParameters: {
                accountType: 'Standard_LRS',
                location: 'eastus'
              },
              storageAccountName: 'cfa6c5953cf5b211e5a5b700'
            }
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is Creating', function() {

      before(function() {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.Storage/storageAccounts/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"Creating"}}');
      });

      after(function() {
        mockingHelper.restore();
      });

      it('should return the state: in progress', function(done) {
        azurestorage.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the storage account, state: Creating',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
            resourceGroupResult: {
              groupParameters: {
                location: 'eastus'
              },
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5'
            },
            storageAccountResult: {
              accountParameters: {
                accountType: 'Standard_LRS',
                location: 'eastus'
              },
              storageAccountName: 'cfa6c5953cf5b211e5a5b700'
            }
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

    describe('When the provisioning state is ResolvingDNS', function() {

      before(function() {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5/providers/Microsoft.Storage/storageAccounts/cfa6c5953cf5b211e5a5b700')
          .yields(null, {statusCode: 200}, '{"properties":{"provisioningState":"ResolvingDNS"}}');
      });

      after(function() {
        mockingHelper.restore();
      });

      it('should return the state: in progress', function(done) {
        azurestorage.poll(validParams, function(err, lastOperation, reply, result) {
          should.not.exist(err);
          lastOperation.should.equal('provision');

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {
              description: 'Creating the storage account, state: ResolvingDNS',
              state: 'in progress'
            }
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
            resourceGroupResult: {
              groupParameters: {
                location: 'eastus'
              },
              resourceGroupName: 'cloud-foundry-a6c5953c-f5b2-11e5-a5b7-000d3a80e5f5'
            },
            storageAccountResult: {
              accountParameters: {
                accountType: 'Standard_LRS',
                location: 'eastus'
              },
              storageAccountName: 'cfa6c5953cf5b211e5a5b700'
            }
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});
