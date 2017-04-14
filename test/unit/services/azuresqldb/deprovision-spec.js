/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azuresqldb/cmd-deprovision');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var sqldbOps = new sqldbOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('SqlDb - Deprovision', function () {

    var cd;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            provisioning_result: {
                'resourceGroup': 'sqldbResourceGroup',
                'id': '/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb',
                'name': 'sqldb',
                'type': 'Microsoft.Sql/servers/databases',
                'location': 'West US',
                'kind': 'v12.0,user',
                'properties': {
                    'databaseId': 'bf19fd8d-8b08-4b11-aceb-16dafee3c7cc',
                    'edition': 'Basic',
                    'status': 'Online',
                    'serviceLevelObjective': 'Basic',
                    'collation': 'SQL_Latin1_General_CP1_CI_AS',
                    'maxSizeBytes': '2147483648',
                    'creationDate': '2016-07-08T08:54:17.73Z',
                    'currentServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                    'requestedServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                    'requestedServiceObjectiveName': null,
                    'defaultSecondaryLocation': 'East US',
                    'earliestRestoreDate': '2016-07-08T09:05:03.543Z',
                    'elasticPoolName': null,
                    'containmentState': 2
                },
                'sqlServerName': 'golive4',
                'administratorLogin': 'greg',
                'administratorLoginPassword': 'P@ssw0rd!'
            },
            azure: azure
        };

        cd = new cmdDeprovision(validParams);
        
        msRestRequest.DELETE = sinon.stub();
        msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, {statusCode: 200});
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Deprovision should return 200 ...', function () {
        it('returns 200 if no err', function (done) {
            cd.deprovision(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.state.should.equal('succeeded');
                result.description.should.equal('Deleted database');
                done();
            });
        });
    });
});
