/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var azureservicebus = require('../../../../lib/services/azureservicebus/');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('ServiceBus', function() {

  describe('Binding', function() {

    describe('When no error is thrown', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          provisioning_result: {'resourceGroupName':'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5','namespaceName':'cfe77a25d2f58c11e5b93300'},
          azure: azure
        };
        
        msRestRequest.POST = sinon.stub();
        msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5/providers/Microsoft.ServiceBus/namespaces/cfe77a25d2f58c11e5b93300/authorizationRules/RootManageSharedAccessKey/ListKeys')
          .yields(null, {statusCode: 200}, '{"primaryKey":"fake-primary-key"}');
      });
      
      after(function () {
        mockingHelper.restore();
      });
      
      it('should return the credentials', function(done) {
        azureservicebus.bind(validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 201,
            code: 'Created',
            value: {
              credentials: {
                namespace_name: 'cfe77a25d2f58c11e5b93300',
                shared_access_key_name: 'RootManageSharedAccessKey',
                shared_access_key_value: 'fake-primary-key'
              },
            },
          };
          reply.should.eql(replyExpected);

          var resultExpected = {};
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});
