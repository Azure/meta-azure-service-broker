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

  describe('Deprovisioning', function() {

    before(function() {
      utils.init = sinon.stub();
      sinon.stub(utils, 'getToken').yields(null, 'fake-access-token');
    });

    after(function(){
      utils.getToken.restore();
    });

    describe('When no error is thrown', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          provisioning_result: '{\"resourceGroupName\":\"cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5\",\"namespaceName\":\"cfe77a25d2f58c11e5b93300\"}',
          azure: azure,
        };
        sinon.stub(utils, 'delNamespace').yields(null);
      });

      after(function() {
        utils.delNamespace.restore();
      });

      it('should delete the namespace', function(done) {
        azureservicebus.deprovision(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 202,
            code: 'Accepted',
            value: {}
          };
          reply.should.eql(replyExpected);

          var resultExpected = {
              'resourceGroupName': 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5',
              'namespaceName': 'cfe77a25d2f58c11e5b93300',
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});
