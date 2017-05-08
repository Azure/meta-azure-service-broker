/*
    test: curl "http://localhost:5001/v2/service_instances/62cb3099-a468-42f0-b2c2-110fe3d86611?service_id=0346088a-d4b2-4478-aa32-f18e295ec1d9&plan_id=1a34c5eb-3cf0-45dc-bb34-94a69dafc992" -u demouser:demopassword -X DELETE -H "X-Broker-API-Version: 2.8" -v
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azurerediscache/cmd-deprovision');
var redisClient = require('../../../../lib/services/azurerediscache/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();
redisClient.initialize(azure);

describe('RedisCache - Deprovision - Execution', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'b259c5e0-7442-46bc-970c-9912613077dd',
            provisioning_result: {'resourceGroupName':'redisResourceGroup','name':'C0CacheNC'}
        };
        validParams.azure = azure;
        cp = new cmdDeprovision(validParams);
        
        msRestRequest.DELETE = sinon.stub();
        msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/redisResourceGroup/providers/Microsoft.Cache/Redis/C0CacheNC')
          .yields(null, {statusCode: 200});
    });

    after(function() {
        mockingHelper.restore();
    });

    describe('Deprovision operation outcomes should be...', function() {
        it('should not exist err and provision result should not change', function(done) {
            
            cp.deprovision(redisClient, function(err, result) {
                should.not.exist(err);
                result.should.equal(validParams.provisioning_result);
                done(null);
            });
            
        });
    });
});    
