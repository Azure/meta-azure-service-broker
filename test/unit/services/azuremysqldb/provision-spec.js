/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuremysqldb/cmd-provision');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mysqldbOps = new mysqldbOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('MySqlDb - Provision - PreConditions', function () {
    var params = {};
    var cp;

    describe('All the required parameters are provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('should succeed to validate the parameters', function () {
            (cp.getInvalidParams().length).should.equal(0);
        });
    });

    describe('parameters file is not provided', function () {

        before(function () {
            params = {
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('should fail to validate the parameters', function () {
            (cp.getInvalidParams().length).should.equal(5);
            cp.getInvalidParams().should.deepEqual([
                'resourceGroupName',
                'location',
                'mysqlServerName',
                'administratorLogin',
                'administratorLoginPassword'
            ]);
        });
    });
});

describe('MySqlDb - Provision - Execution', function () {
    var params = {};
    var cp;
    
    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    allowMysqlServerFirewallRules: [{
                        ruleName: 'newrule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    properties: {
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            azure: azure
        };

        cp = new cmdProvision(params);
        
        msRestRequest.PUT = sinon.stub();
        msRestRequest.GET = sinon.stub();
        
        // create resource group
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 200});  
        
        // create server
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
            .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-serverPollingUrl'} }, {properties: {fullyQualifiedDomainName: 'fake-fqdn'}});
    });

    after(function () {
        mockingHelper.restore();
    });
        
    describe('Server that does not previously exist', function() {

        before(function () {
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
            cp.provision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                done();
            });
        });
    });

});