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
var azureservicebus = require('../../../../lib/services/azureservicebus/');
var utils = require('../../../../lib/services/azureservicebus/utils');
var azure = require('../helpers').azure;

var log = logule.init(module, 'ServiceBus-Mocha');

describe('ServiceBus', function() {

  describe('Binding', function() {

    before(function() {
      utils.init = sinon.stub();
      sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
    });

    after(function() {
      utils.getToken.restore();
    });
    describe('When no error is thrown', function() {
      var validParams = {};
      var key_name = 'RootManageSharedAccessKey';
      var key_value = 'fake-primary-key';

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          provisioning_result: '{\"resourceGroupName\":\"cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5\",\"namespaceName\":\"cfe77a25d2f58c11e5b93300\"}',
          azure: azure,
        };
        sinon.stub(utils, 'listNamespaceKeys').yields(null, key_name, key_value);
      });

      after(function() {
        utils.listNamespaceKeys.restore();
      });

      it('should return the credentials', function(done) {
        azureservicebus.bind(log, validParams, function(
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
