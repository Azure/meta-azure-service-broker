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
var azurestorage = require('../../../../lib/services/azurestorage/');
var storageClient = require('../../../../lib/services/azurestorage/storageclient');
var azure = require('../helpers').azure;

var log = logule.init(module, 'Storage-Mocha');

describe('Storage', function() {

  describe('Binding', function() {

    before(function() {
      storageClient.init = sinon.stub();
    });

    describe('When no error is thrown', function() {
      var validParams = {};
      var primaryKey = 'fake-primary-key';
      var secondaryKey = 'fake-secondary-key';

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          parameters: {
          },
          provisioning_result: '{\"resourceGroupResult\":{\"resourceGroupName\":\"cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5\",\"groupParameters\":{\"location\":\"eastus\"}},\"storageAccountResult\":{\"storageAccountName\":\"cfe77a25d2f58c11e5b93300\",\"accountParameters\":{\"location\":\"eastus\",\"accountType\":\"Standard_LRS\"}}}',
          azure: azure,
        };
        sinon.stub(storageClient, 'bind').yields(null,
          primaryKey, secondaryKey);
      });

      after(function() {
        storageClient.bind.restore();
      });

      it('should return the credentials', function(done) {
        azurestorage.bind(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 201,
            code: 'Created',
            value: {
              credentials: {
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

