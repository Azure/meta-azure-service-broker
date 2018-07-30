/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var HttpStatus = require('http-status-codes');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuresqldb/cmd-poll');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');
var util = require('util');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

var afterProvisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        sqlServerName: 'golive4',
        sqlServerParameters: {
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        transparentDataEncryption: false,
        sqldbParameters: {
            properties: {
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                createMode: 'Default',
                edition: 'Basic',
                requestedServiceObjectiveName: 'Basic'
            }
        }
    },
    last_operation: 'provision',
    provisioning_result: {
        'resourceGroup': 'sqldbResourceGroup',
        'administratorLogin': 'xxxx',
        'administratorLoginPassword': 'xxxxxxx',
        'operation': 'CreateLogicalDatabase',
        'startTime': '/ Date(1467968057450 + 0000) / ',
        'id': 'subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/ sqldbResourceGroup / providers / Microsoft.Sql / servers / golive4 / databases / sqldb',
        'type': 'Microsoft.Sql / servers / databases',
        'provisioningResult': 'creating',
        'sqlServerName': 'golive4',
        'sqldbName': 'sqldb',
        'sqldbParameters': {
            'location': 'westus',
            'properties': {
                'collation': 'SQL_Latin1_General_CP1_CI_AS',
                'maxSizeBytes': '2147483648',
                'createMode': 'Default',
                'edition': 'Basic',
                'requestedServiceObjectiveName': 'Basic'
            }
        }
    },
    azure: azure,
    'defaultSettings': {
      'sqldb': {
        'transparentDataEncryption': false
      }
    }
};

var afterProvisionValidParamsWithTDE = JSON.parse(JSON.stringify(afterProvisionValidParams));
afterProvisionValidParamsWithTDE.parameters.transparentDataEncryption = true;

var afterDeprovisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        sqlServerName: 'golive4',
        sqlServerParameters: {
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        sqldbParameters: {
            properties: {
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                createMode: 'Default',
                edition: 'Basic',
                requestedServiceObjectiveName: 'Basic'
            }
        }
    },
    last_operation: 'deprovision',
    provisioning_result: {
        'resourceGroup': 'sqldbResourceGroup',
        'id': '/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb',
        'name': 'sqldb',
        'type': 'Microsoft.Sql/servers/databases',
        'location': 'West US',
        'kind': 'v12.0,user',
        'properties': {
            'databaseId': '1e141874-5886-4077-a476-f2ecc4b0016d',
            'edition': 'Basic',
            'status': 'Online',
            'serviceLevelObjective': 'Basic',
            'collation': 'SQL_Latin1_General_CP1_CI_AS',
            'maxSizeBytes': '2147483648',
            'creationDate': '2016-07-09T13:39:44.4Z',
            'currentServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
            'requestedServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
            'requestedServiceObjectiveName': null,
            'defaultSecondaryLocation': 'East US',
            'earliestRestoreDate': '2016-07-09T13:49:55.667Z',
            'elasticPoolName': null,
            'containmentState': 2
        },
        'sqlServerName': 'golive4',
        'administratorLogin': 'xxxx',
        'administratorLoginPassword': 'xxxxxxx'
    },
    azure: azure,
    'defaultSettings': {
      'sqldb': {
        'transparentDataEncryption': false
      }
    }
};

var afterUpdateValidParams = {
    'azureInstanceId': 'azure-sqldb-niroy-sqlsvr-test-db1126',
    'status': 'success',
    'timestamp': '2017-08-02T22:53:16.090Z',
    'instance_id': 'b93fb802-8342-40b0-ac25-3217c420ee9a',
    'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    'plan_id': '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    'organization_guid': 'b499ecff-378e-4e48-ae13-6e027ac9edf4',
    'space_guid': 'fba5706c-74c2-448d-9fc7-ce3f0500557e',
    'parameters': {
        'transparentDataEncryption': true,
        'sqldbParameters': {
            'properties': {
                'collation': 'SQL_Latin1_General_CP1_CI_AS',
                'maxSizeBytes': '2147483648',
                'edition': 'Basic',
                'requestedServiceObjectiveName': 'Basic',
                'sourceDatabaseId': '/subscriptions/uuid/resourceGroups/niroy-rg1/providers/Microsoft.Sql/servers/niroy-sqlsvr/databases/test-db'
            },
            'tags': {
                'user-agent': 'meta-azure-service-broker'
            },
            'location': 'West US'
        },
        'sqlServerName': 'niroy-sqlsvr',
        'sqldbName': 'test-db1126',
        'location': 'West US',
        'requestId': '32c52cd1-5766-43fd-8271-ebcc224fcd69'
    },
    'last_operation': 'update',
    'provisioning_result': {
        'tags': {
            'user-agent': 'meta-azure-service-broker'
        },
        'id': '/subscriptions/uuid/resourceGroups/niroy-rg1/providers/Microsoft.Sql/servers/niroy-sqlsvr/databases/test-db1126',
        'name': 'test-db1126',
        'type': 'Microsoft.Sql/servers/databases',
        'location': 'West US',
        'kind': 'v12.0,user',
        'properties': {
            'databaseId': 'uuid',
            'edition': 'Basic',
            'status': 'Online',
            'serviceLevelObjective': 'Basic',
            'collation': 'SQL_Latin1_General_CP1_CI_AS',
            'maxSizeBytes': '2147483648',
            'creationDate': '2017-07-07T23:43:11.68Z',
            'currentServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
            'requestedServiceObjectiveId': 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
            'requestedServiceObjectiveName': 'Basic',
            'sampleName': null,
            'defaultSecondaryLocation': 'East US',
            'earliestRestoreDate': '2017-07-07T23:53:47.507Z',
            'elasticPoolName': null,
            'containmentState': 2,
            'readScale': 'Disabled',
            'failoverGroupId': null
        },
        'operation': 'CreateLogicalDatabase',
        'startTime': '/Date(1499470991413+0000)/',
        'resourceGroup': 'niroy-rg1',
        'sqlServerName': 'niroy-sqlsvr',
        'fullyQualifiedDomainName': 'niroy-sqlsvr.database.windows.net',
        'administratorLogin': 'niroy',
        'administratorLoginPassword': 'xxxxxxxx'
    },
    'state': {
        'asyncOperation': 'https://management.azure.com/subscriptions/uuid/resourceGroups/niroy-rg1/providers/Microsoft.Sql/servers/niroy-sqlsvr/databases/test-db/azureAsyncOperation/uuid?api-version=2014-04-01-Preview'
    },
    'azure': azure,
    'defaultSettings': {
        'sqldb': {
            'transparentDataEncryption': false
        }
    }
};

var sqldbOps = new sqldbOperations(azure);

describe('SqlDb - Poll - polling database immediately after creation is started', function () {

    var cp;
    var sqldbOpsGetDatabaseResult = {
        statusCode: 404,
        value:
        {
            state: 'in progress',
            description: 'Creating logical database sqldb on logical server golive4.'
        }
    };

    before(function () {
        cp = new cmdPoll(afterProvisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, sqldbOpsGetDatabaseResult);
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 immediately after starting to provision a database', function () {
        it('should interpret the 404 from GetDatabase as creating the database', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Creating logical database sqldb on logical server golive4.');
                done();
            });
        });
    });
});


describe('SqlDb - Poll - polling database after creation is complete', function () {

    var tdeSpy = sinon.spy(sqldbOps, 'setTransparentDataEncryption');
    var sqldbOpsGetDatabaseResult = {
        statusCode: 200,
        body: {
            id: '/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb',
            name: 'sqldb',
            type: 'Microsoft.Sql/servers/databases',
            location: 'West US',
            kind: 'v12.0,user',
            properties: {
                databaseId: 'bf19fd8d-8b08-4b11-aceb-16dafee3c7cc',
                edition: 'Basic',
                status: 'Online',
                serviceLevelObjective: 'Basic',
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                creationDate: '2016-07-08T08:54:17.73Z',
                currentServiceObjectiveId: 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                requestedServiceObjectiveId: 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                requestedServiceObjectiveName: null,
                defaultSecondaryLocation: 'East US',
                earliestRestoreDate: '2016-07-08T09:05:03.543Z',
                elasticPoolName: null,
                containmentState: 2
            }
        }
    };

    beforeEach(function () {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, sqldbOpsGetDatabaseResult, JSON.stringify(sqldbOpsGetDatabaseResult.body));
        msRestRequest.PUT = sinon.stub();
    });

    afterEach(function () {
        mockingHelper.restore();
    });

    describe('Poll should ...', function () {
        it('return 200 if it is executed after sufficient time', function (done) {
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                tdeSpy.called.should.equal(false);
                result.body.sqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.statusCode.should.equal(HttpStatus.OK);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created logical database sqldb on logical server golive4.');
                done();
            });
        });
    });

    describe('TransparentDataEncryption should ...', function () {
        it('not be called if TDE setting is false', function (done) {
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(sqldbOps, function (err, result) {
                tdeSpy.called.should.equal(false);
                should.not.exist(err);
                done();
            });
        });

        it('fail if transparent data encryption failed', function (done) {
            var cp = new cmdPoll(afterProvisionValidParamsWithTDE);
            var tdeError = new Error('TDE failure');
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb/transparentDataEncryption/current')
              .yields(tdeError);
            cp.poll(sqldbOps, function (err, result) {
                should.exist(err);
                err.message.should.equal('TDE failure');
                done();
            });
        });

        it('fail if an unexpected error code is received without an error', function (done) {
            var cp = new cmdPoll(afterProvisionValidParamsWithTDE);
            var tdeResult = {
                statusCode:HttpStatus.BAD_GATEWAY,
                body:{
                    message:'Bad Gateway'
                }
            };
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb/transparentDataEncryption/current')
              .yields(null, tdeResult, tdeResult.body);

            cp.poll(sqldbOps, function (err, result) {
                should.exist(err);
                err.message.should.equal('Bad Gateway');
                done();
            });
        });

        it('succeed on CREATED return code', function (done) {
            var cp = new cmdPoll(afterProvisionValidParamsWithTDE);
            var tdeResult = {
                statusCode:HttpStatus.CREATED,
                body:{
                    message:'success'
                }
            };
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb/transparentDataEncryption/current')
              .yields(null, tdeResult, tdeResult.body);

            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.statusCode.should.equal(HttpStatus.OK);
                result.value.state.should.equal('succeeded');
                done();
            });
        });
    });

});

describe('SqlDb - Poll - polling database after de-provision is complete', function () {

    var cp;

    before(function () {
        cp = new cmdPoll(afterDeprovisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, {statusCode: 404});
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 after de-provisioning is complete', function () {
        it('should correctly interpret 404 as database is deleted', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Database has been deleted.');
                done();
            });
        });
    });
});

describe('SqlDb - Poll - polling database after update operation', function () {

    var cp, msRestRequestStub;

    beforeEach(function(){
        cp = new cmdPoll(afterUpdateValidParams);
    });

    afterEach(function () {
        msRestRequestStub.restore();
    });

    describe('When Azure returns polling success', function (){
        beforeEach(function () {
            msRestRequestStub = sinon.stub(msRestRequest, 'GET').yields(null, { body: '{"operationId":"3b87fd39-dd11-4e96-a107-080d24ed76b2","status":"Succeeded","error":null}'});
        });

        it('Should return correct success reply', function(done){
            cp.poll(sqldbOps, function(err, results){
                results.value.should.deepEqual({state:'succeeded', description:'Database has been updated.'});
                done(err);
            });
        });

        it('Should extract correct version', function(done) {
            cp.poll(sqldbOps, function (err, results) {
                msRestRequestStub.calledOnce.should.be.true();
                msRestRequestStub.args[0][2].should.equal('2014-04-01-Preview');
                done(err);
            });
        });
    });

    describe('When Azure returns update is in progress', function(){
        beforeEach(function () {
            msRestRequestStub = sinon.stub(msRestRequest, 'GET').yields(null, { body: '{"operationId":"e49927e6-45ac-41f5-9cf1-54a356fea237","status":"InProgress","error":null}' });
        });

        it('Should return correct poll reply', function (done) {
            cp.poll(sqldbOps, function (err, results) {
                results.value.should.deepEqual({ state: 'in progress', description: 'Database is being updated.' });
                done(err);
            });
        });
    });

    describe('When Azure returns failure because update is not possible', function () {
        var body = '{"code":"45181","message":"Resource with the name \u00274e7a5ba5-d8ec-4bfa-b9ef-16ecf03856eb\u0027 does not exist. To continue, specify a valid resource name.","target":null,"details":[{"code":"45181","message":"Resource with the name \u00274e7a5ba5-d8ec-4bfa-b9ef-16ecf03856eb\u0027 does not exist. To continue, specify a valid resource name.","target":null,"severity":"16"}],"innererror":[]}';
        beforeEach(function () {
            msRestRequestStub = sinon.stub(msRestRequest, 'GET').yields(null, { statusCode:400, body: body });
        });

        it('Should return correct failure reply', function (done) {
            cp.poll(sqldbOps, function (err, results) {
                results.value.should.deepEqual({ state: 'failed', description: util.format('Error updating database: statusCode: 400 body: %j', body) });
                done(err);
            });
        });
    });
});

describe('SqlDb - Poll - registering existing database plan', function () {

    var cp;

    describe('the last operation is provision', function () {
        before(function () {
            afterProvisionValidParams.plan_id = '4b1cfc28-dda6-407b-abeb-7aa0b89f52bf';
            cp = new cmdPoll(afterProvisionValidParams);
        });

        after(function () {
            afterProvisionValidParams.plan_id = '3819fdfa-0aaa-11e6-86f4-000d3a002ed5';
        });

        it('should directly succeed', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Registered the database as a service instance.');
                done();
            });
        });
    });

    describe('the last operation is provision', function () {
        before(function () {
            afterDeprovisionValidParams.plan_id = '4b1cfc28-dda6-407b-abeb-7aa0b89f52bf';
            cp = new cmdPoll(afterDeprovisionValidParams);
        });

        after(function () {
            afterDeprovisionValidParams.plan_id = '3819fdfa-0aaa-11e6-86f4-000d3a002ed5';
        });

        it('should directly succeed', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Unregistered the database.');
                done();
            });
        });
    });
});
