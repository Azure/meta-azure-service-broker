/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuresqldb/cmd-poll');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;

var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSIsImtpZCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuYXp1cmUuY29tLyIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJpYXQiOjE0Njc4MTYyMTcsIm5iZiI6MTQ2NzgxNjIxNywiZXhwIjoxNDY3ODIwMTE3LCJhcHBpZCI6ImQ4MTllODE4LTRkNGEtNGZmOS04OWU5LTliZTBiZmVjOWVjZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJvaWQiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJzdWIiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ2ZXIiOiIxLjAifQ.tqCAMoZz7n3AKBjdNUHwGfLSaDp7Qdl6Dzu_5cf5WNoKCet9E6ohLZtohfiLXuNS-uG-UDRDNtvX_eVayui422CkdDSbAtEPZXIRaFD8dGVO3uMRKWhWQ1u-aTA8LKHKKO2a6aF9hWwjHDQ_FRwi1qZ8UX60HkW62MgLlJeym5AC8aL0JKVekmrVx-NGcfJJs7VXVOLbka45ADAlUNqi13TxyEY_oqCZzGatJZK8sFNYMvGFtTcnhjSEoxdl9LjcMAWWgVuKg-iVAX1vAf0HhD7H3XqJKPaZR-o2fQ5kvEKzzfz_VkUeQO4DG-1gpKS_jNVynb1ZxUGbs5y56WmDDw';

var afterProvisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        sqlServerName: 'golive4',
        sqlServerCreateIfNotExist: true,
        sqlServerParameters: {
            location: 'westus',
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        sqldbParameters: {
            location: 'westus',
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
    provisioning_result: "{\"administratorLogin\":\"xxxx\",\"administratorLoginPassword\":\"xxxxxxx\",\"operation\":\"CreateLogicalDatabase\",\"startTime\":\"/ Date(1467968057450 + 0000) / \",\"id\":\"subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/ sqldbResourceGroup / providers / Microsoft.Sql / servers / golive4 / databases / sqldb\",\"type\":\"Microsoft.Sql / servers / databases\",\"provisioningResult\":\"creating\",\"sqlServerName\":\"golive4\",\"sqldbName\":\"sqldb\",\"sqldbParameters\":{\"location\":\"westus\",\"properties\":{\"collation\":\"SQL_Latin1_General_CP1_CI_AS\",\"maxSizeBytes\":\"2147483648\",\"createMode\":\"Default\",\"edition\":\"Basic\",\"requestedServiceObjectiveName\":\"Basic\"}}}",
    azure: azure
};

var afterDeprovisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        sqlServerName: 'golive4',
        sqlServerCreateIfNotExist: true,
        sqlServerParameters: {
            location: 'westus',
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        sqldbParameters: {
            location: 'westus',
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
    provisioning_result: '{\"id\":\"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb\",\"name\":\"sqldb\",\"type\":\"Microsoft.Sql/servers/databases\",\"location\":\"West US\",\"kind\":\"v12.0,user\",\"properties\":{\"databaseId\":\"1e141874-5886-4077-a476-f2ecc4b0016d\",\"edition\":\"Basic\",\"status\":\"Online\",\"serviceLevelObjective\":\"Basic\",\"collation\":\"SQL_Latin1_General_CP1_CI_AS\",\"maxSizeBytes\":\"2147483648\",\"creationDate\":\"2016-07-09T13:39:44.4Z\",\"currentServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveName\":null,\"defaultSecondaryLocation\":\"East US\",\"earliestRestoreDate\":\"2016-07-09T13:49:55.667Z\",\"elasticPoolName\":null,\"containmentState\":2},\"sqlServerName\":\"golive4\",\"administratorLogin\":\"xxxx\",\"administratorLoginPassword\":\"xxxxxxx\"}',
    azure: azure
};

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

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
        cp = new cmdPoll(log, afterProvisionValidParams);
    });

    after(function () {
        sqldbOps.getToken.restore();
        sqldbOps.getDatabase.restore();
    });

    describe('Poll should return 200 immediately after starting to provision a database', function () {
        it('should interpret the 404 from GetDatabase as creating the database', function (done) {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getDatabase').yields(null, sqldbOpsGetDatabaseResult);
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

    var cp;
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

    before(function () {
        cp = new cmdPoll(log, afterProvisionValidParams);
    });

    after(function () {
        sqldbOps.getToken.restore();
        sqldbOps.getDatabase.restore();
    });

    describe('Poll should return 200 if ...', function () {
        it('is executed after sufficient time', function (done) {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getDatabase').yields(null, sqldbOpsGetDatabaseResult);
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.sqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created logical database sqldb on logical server golive4.');
                done();
            });
        });
    });
});

/*  fill in this one when I can catch azure being slow enough
describe('SqlDb - Poll - polling database immediately after de-provision is started', function () {

    var cp;

    before(function () {
        cp = new cmdPoll(log, afterDeprovisionValidParams);
    });

    after(function () {
        sqldbOps.getToken.restore();
        sqldbOps.getDatabase.restore();
    });

    describe('Poll should return xxx immediately after starting to de-provision a database', function () {
        it('should work', function (done) {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getDatabase').yields(null, sqldbOpsGetDatabaseResult);
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                done();
            });
        });
    });
});
*/

describe('SqlDb - Poll - polling database after de-provision is complete', function () {

    var cp;

    sqldbOpsGetDatabaseResult = {
        statusCode: 404,
        value:
        {
            state: 'succeeded',
            description: 'Database has been deleted.'
        }
    };

    before(function () {
        cp = new cmdPoll(log, afterDeprovisionValidParams);
    });

    after(function () {
        sqldbOps.getToken.restore();
        sqldbOps.getDatabase.restore();

    });

    describe('Poll should return 200 after de-provisioning is complete', function () {
        it('should correctly interpret 404 as database is deleted', function (done) {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getDatabase').yields(null, sqldbOpsGetDatabaseResult);
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Database has been deleted.');
                done();
            });
        });
    });
});

