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
var azurestorageblob = require('../../../../lib/services/azurestorageblob/');
var storageBlobClient = require('../../../../lib/services/azurestorageblob/storageblobclient');

var log = logule.init(module, 'StorageBlob-Mocha');

describe('StorageBlob', function() {

  describe('Provisioning', function() {

    before(function() {
      storageBlobClient.init = sinon.stub();
    });

    describe('When no specific parameters are provided', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: common.getCredentialsAndSubscriptionId(),
        };
        sinon.stub(storageBlobClient, 'provision').yields(null, [{
          'resourceGroupName': 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          'groupParameters': {
            'location': 'eastus'
          }
        }, {
          'storageAccountName': 'cfe77a25d2f58c11e5b93300',
          'accountParameters': {
            'location': 'eastus',
            'accountType': 'Standard_LRS'
          }
        }]);
      });

      after(function() {
        storageBlobClient.provision.restore();
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

    describe('When specific parameters are provided and valid',
      function() {
        var validParams = {};

        before(function() {
          validParams = {
            instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
            azure: common.getCredentialsAndSubscriptionId(),
            parameters: {
              resource_group_name: 'binxi031702',
              storage_account_name: 'binxi031702sa',
              location: 'westus',
              account_type: 'Standard_LRS'
            }
          };
          sinon.stub(storageBlobClient, 'provision').yields(null, [{
            'resourceGroupName': 'binxi031702',
            'groupParameters': {
              'location': 'eastus'
            }
          }, {
            'storageAccountName': 'binxi031702sa',
            'accountParameters': {
              'location': 'eastus',
              'accountType': 'Standard_LRS'
            }
          }]);
        });

        after(function() {
          storageBlobClient.provision.restore();
        });

        it('should create the storage blob', function(done) {
          azurestorageblob.provision(log, validParams, function(
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
                'resourceGroupName': 'binxi031702',
                'groupParameters': {
                  'location': 'eastus'
                }
              },
              storageAccountResult: {
                'storageAccountName': 'binxi031702sa',
                'accountParameters': {
                  'location': 'eastus',
                  'accountType': 'Standard_LRS'
                }
              }
            };
            result.should.eql(resultExpected);

            done();
          });
        });
      });

    describe('When specific parameters are provided and invalid',
      function() {
        var validParams = {};

        before(function() {
          validParams = {
            instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
            azure: common.getCredentialsAndSubscriptionId(),
            parameters: {
              resource_group_name: 'binxi031702',
              storage_account_name: 'binxi031702-sa',
              location: 'westus',
              account_type: 'Standard_LRS'
            }
          };
          sinon.stub(storageBlobClient, 'provision').yields({
            statusCode: 400,
            code: 'AccountNameInvalid'
          });
        });

        after(function() {
          storageBlobClient.provision.restore();
        });

        it('should create the storage blob', function(done) {
          azurestorageblob.provision(log, validParams, function(
            err, reply, result) {
            should.exist(err);
            err.should.have.property('statusCode', 400);
            err.should.have.property('code',
              'AccountNameInvalid');
            done();
          });
        });
      });

  });
});
