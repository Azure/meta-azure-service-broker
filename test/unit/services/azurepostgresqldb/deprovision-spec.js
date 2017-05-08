/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azurepostgresqldb/cmd-deprovision');
var postgresqldbOperations = require('../../../../lib/services/azurepostgresqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var postgresqldbOps = new postgresqldbOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('PostgreSqlDb - Deprovision', function () {

    var cd;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            provisioning_result: {
                'resourceGroup':'sqldbResourceGroup',
                'postgresqlServerName':'golive4',
                'administratorLogin':'greg',
                'administratorLoginPassword':'P@ssw0rd!'
            },
            azure: azure
        };

        cd = new cmdDeprovision(validParams);
        
        msRestRequest.DELETE = sinon.stub();
        msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforPostgreSQL/servers/golive4')
          .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-serverPollingUrl'}});
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Deprovision should return 202 ...', function () {
        it('returns 202 if no err', function (done) {
            cd.deprovision(postgresqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.serverPollingUrl.should.equal('fake-serverPollingUrl');
                
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Deleting Server');
                done();
            });
        });
    });
});
