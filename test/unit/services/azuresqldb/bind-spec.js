/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdbind = require('../../../../lib/services/azuresqldb/cmd-bind');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;

var sqldbOps = new sqldbOperations(azure);

describe('SqlDb - bind', function () {

    var cb;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
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
            provisioning_result: {
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

        cb = new cmdbind(validParams);
    });

    after(function () {
        sqldbOps.executeSql.restore();
    });

    describe('', function () {
        sinon.stub(sqldbOps, 'executeSql').yields(null);
        it('should not callback error', function (done) {
            cb.bind(sqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.databaseLogin);
                should.exist(result.databaseLoginPassword);
                done();
            });
        });
    });
});
