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

  describe('Provisioning', function() {

    describe('When no specific parameters are provided', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: azure,
        };
      });

      it('should return missing parameter error', function(done) {
        azurestorage.provision(validParams, function(
          err, reply, result) {
          err.should.have.property('description',
            'The parameters ["resource_group_name","storage_account_name","location","account_type"] are missing.');
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
            azure: azure,
            parameters: {
              resource_group_name: 'test031702',
              storage_account_name: 'test031702sa',
              location: 'westus',
              account_type: 'Standard_LRS'
            }
          };
          
          msRestRequest.POST = sinon.stub();
          msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/providers/Microsoft.Storage/checkNameAvailability')
            .yields(null, {statusCode: 200}, {nameAvailable: true});
            
          msRestRequest.PUT = sinon.stub();
          msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/test031702')
            .yields(null, {statusCode: 200});
            
          msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/test031702/providers/Microsoft.Storage/storageAccounts/test031702sa')
            .yields(null, {statusCode: 202});
        });

        after(function() {
          mockingHelper.restore();
        });

        it('should create the storage', function(done) {
          azurestorage.provision(validParams, function(
            err, reply, result) {
            should.not.exist(err);
            var replyExpected = {
              statusCode: 202,
              code: 'Accepted',
              value: {}
            };
            reply.should.eql(replyExpected);
            var resultExpected = {
              resourceGroupResult: {
                'resourceGroupName': 'test031702',
                'groupParameters': {
                  'location': 'westus'
                }
              },
              storageAccountResult: {
                'storageAccountName': 'test031702sa',
                'accountParameters': {
                  'kind': 'Storage',
                  'location': 'westus',
                  'sku': {
                    'name': 'Standard_LRS'
                  },
                  'tags': {
                    'user-agent': 'meta-azure-service-broker'
                  }
                }
              }
            };
            result.should.eql(resultExpected);

            done();
          });
        });
      });

    describe('When specific parameters are provided but invalid',
      function() {
        var validParams = {};

        before(function() {
          validParams = {
            instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
            azure: azure,
            parameters: {
              resource_group_name: 'test031702',
              storage_account_name: 'test031702-sa',
              location: 'westus',
              account_type: 'Standard_LRS'
            }
          };

          msRestRequest.POST = sinon.stub();
          msRestRequest.POST.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/providers/Microsoft.Storage/checkNameAvailability')
            .yields(null, {statusCode: 200}, {
                                               message: 'The storage account named test031702-sa is invalid.',
                                               nameAvailable: false,
                                               reason: 'AccountNameInvalid'
                                             });
        });

        after(function() {
          mockingHelper.restore();
        });

        it('should create the storage', function(done) {
          azurestorage.provision(validParams, function(
            err, reply, result) {
            should.exist(err);
            err.should.have.property('statusCode', 400);
            done();
          });
        });
      });

  });
});

