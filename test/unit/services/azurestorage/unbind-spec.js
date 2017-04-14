/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azurestorage = require('../../../../lib/services/azurestorage/');
var azure = require('../helpers').azure;

describe('Storage', function() {

  describe('Unbinding', function() {

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
      });

      after(function() {
      });

      it('should unbind the service', function(done) {
        azurestorage.unbind(validParams, function(
          err, reply, result) {
          should.not.exist(err);

          var replyExpected = {
            statusCode: 200,
            code: 'OK',
            value: {}
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
