/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */
var should = require('should');
var sinon = require('sinon');
var azureeventhubs = require('../../../../lib/services/azureeventhubs/');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('EventHubs', function() {

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
        azureeventhubs.provision(validParams, function(err, reply, result) {
          should.exist(err);
          err.should.have.property('description', 'The parameters ["resourceGroup","location","namespaceName","eventHubName"] are missing.');
          done();
        });
      });
    });

    describe('When specific parameters are provided and valid', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: azure,
          parameters: {
            resourceGroup: 'mysbtest',
            namespaceName: 'mysb',
            eventHubName: 'testeh',
            location: 'westus',
            tags: {
              foo: 'bar'
            }
          }
        };
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/mysbtest/providers/Microsoft.EventHub/namespaces/mysb')
          .yields(null, {statusCode: 404});
          
        msRestRequest.PUT = sinon.stub();
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/mysbtest')
          .yields(null, {statusCode: 200});
        // create namespace
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/mysbtest/providers/Microsoft.EventHub/namespaces/mysb')
          .yields(null, {statusCode: 200});
      });

      after(function () {
        mockingHelper.restore();
      });
    
      it('should create the namespace', function(done) {
        azureeventhubs.provision(validParams, function(
          err, reply, result) {
          should.not.exist(err);
          var replyExpected = {
            statusCode: 202,
            code: 'Accepted',
            value: {}
          };
          reply.should.eql(replyExpected);
          var resultExpected = {
              'resourceGroupName': 'mysbtest',
              'namespaceName': 'mysb',
              'eventHubName': 'testeh',
              'eventHubProperties': undefined
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});
