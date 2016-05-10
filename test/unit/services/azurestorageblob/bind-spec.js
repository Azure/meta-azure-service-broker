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

  describe('Binding', function() {

    before(function() {
      storageBlobClient.init = sinon.stub();
    });

    describe('When no error is thrown', function() {
      var sandbox;
      var validParams = {};
      var primaryKey = 'fake-primary-key';
      var secondaryKey = 'fake-secondary-key';

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          provisioning_result: '{\"resourceGroupResult\":{\"resourceGroupName\":\"cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5\",\"groupParameters\":{\"location\":\"eastus\"}},\"storageAccountResult\":{\"storageAccountName\":\"cfe77a25d2f58c11e5b93300\",\"accountParameters\":{\"location\":\"eastus\",\"accountType\":\"Standard_LRS\"}}}',
          azure: common.getCredentialsAndSubscriptionId(),
        };
        sinon.stub(storageBlobClient, 'bind').yields(null,
          primaryKey, secondaryKey);
      });

      after(function() {
        storageBlobClient.bind.restore();
      });

      it('should return the credentials', function(done) {
        azurestorageblob.bind(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 201,
            code: 'Created',
            value: {
              credentials: {
                container_name: 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5',
                primary_access_key: 'fake-primary-key',
                secondary_access_key: 'fake-secondary-key',
                storage_account_name: 'cfe77a25d2f58c11e5b93300',
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
