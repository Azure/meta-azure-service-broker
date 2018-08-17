/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var sinon = require('sinon');
var cmdUpdate = require('../../../../lib/services/azurerediscache/cmd-update');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');
var deepExtend = require('deep-extend');
var HttpStatus = require('http-status-codes');
require('should');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
redisClient.initialize(azure);

describe('RedisCache - Update', function () {

  var validParams = {
    'instance': {
      'azureInstanceId': 'azure-rediscache-fake',
      'status': 'success',
      'timestamp': '2017-03-24T04:51:49.466Z',
      'instance_id': 'aa4d7eff-70af-4637-bf5e-398ebaf1ac2c',
      'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
      'plan_id': '3819fdfa-0aaa-11e6-86f4-000d3a002ed5', // Basic plan
      'organization_guid': 'b499ecff-378e-4e48-ae13-6e027ac9edf4',
      'space_guid': 'fba5706c-74c2-448d-9fc7-ce3f0500557e',
      'parameters': {
        'resourceGroup': 'redisResourceGroup',
        'location': 'northcentralus',
        'cacheName': 'C0CacheNC',
        'parameters': {
          'enableNonSslPort': false
        }
      },
      'last_operation': 'provision'
    },
    'requested': {
      'instance_id': 'aa4d7eff-70af-4637-bf5e-398ebaf1ac2c',
      'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
      'plan_id': '170fb362-990d-4373-8f47-5d43c593b978',
      'parameters': {
        'parameters': {
          'enableNonSslPort': true
        }
      },
      'accepts_incomplete': 'true',
    },
    'azure' : azure
  };

  var updateDiff = {
    'plan_id': '170fb362-990d-4373-8f47-5d43c593b978',
    'parameters': {
      'parameters': {
        'enableNonSslPort': true
      }
    },
    'last_operation': 'update'
  };

  var expectedUpdatedInstance = deepExtend(deepExtend({}, validParams.instance), updateDiff);

  describe('plan update', function(){
    var cu;

    before(function(){
      cu = new cmdUpdate(validParams);
      msRestRequest.PUT = sinon.stub();
      msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheNC')
      .yields(null, {statusCode: 200}, {properties: {provisioningState : 'Creating'}});
    });
    after(function(){
      mockingHelper.restore();
    });

    it('Should succeed to update the redis instance', function(done) {
      cu.update(redisClient, function(err, reply, updatedInstance) {
        reply.should.deepEqual({
          'code': HttpStatus.getStatusText(HttpStatus.ACCEPTED),
          'statusCode': HttpStatus.ACCEPTED,
          'value': {
            'description': 'Azure accepted redis cache update request for C0CacheNC',
            'state': 'in progress'
          }
        });
        updatedInstance.should.deepEqual(expectedUpdatedInstance);
        done();
      });
    });
  });
});
