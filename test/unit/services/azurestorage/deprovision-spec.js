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

  describe('Deprovisioning', function() {

    describe('When no error is thrown', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          provisioning_result: {
            'resourceGroupResult': {
              'resourceGroupName': 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5',
              'groupParameters': {
                'location': 'eastus'
              }
            },
            'storageAccountResult': {
              'storageAccountName': 'cfe77a25d2f58c11e5b93300',
              'accountParameters': {
                'location': 'eastus',
                'accountType': 'Standard_LRS'
              }
            }
          },
          azure: azure,
        };
        
        msRestRequest.DELETE = sinon.stub();
        msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5/providers/Microsoft.Storage/storageAccounts/cfe77a25d2f58c11e5b93300')
          .yields(null, {statusCode: 200});
      });

      after(function() {
        mockingHelper.restore();
      });

      it('should delete the storage', function(done) {
        azurestorage.deprovision(validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 202,
            code: 'Accepted',
            value: {}
          };
          reply.should.eql(replyExpected);

          result.should.eql(validParams.provisioning_result);

          done();
        });
      });
    });

  });
});
