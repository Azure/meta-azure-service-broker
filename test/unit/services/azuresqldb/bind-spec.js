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
var cmdbind = require('../../../../lib/services/azuresqldb/cmd-bind');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

describe('SqlDb - bind', function () {

    var cb;
    
    var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSIsImtpZCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuYXp1cmUuY29tLyIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJpYXQiOjE0Njc4MTYyMTcsIm5iZiI6MTQ2NzgxNjIxNywiZXhwIjoxNDY3ODIwMTE3LCJhcHBpZCI6ImQ4MTllODE4LTRkNGEtNGZmOS04OWU5LTliZTBiZmVjOWVjZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJvaWQiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJzdWIiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ2ZXIiOiIxLjAifQ.tqCAMoZz7n3AKBjdNUHwGfLSaDp7Qdl6Dzu_5cf5WNoKCet9E6ohLZtohfiLXuNS-uG-UDRDNtvX_eVayui422CkdDSbAtEPZXIRaFD8dGVO3uMRKWhWQ1u-aTA8LKHKKO2a6aF9hWwjHDQ_FRwi1qZ8UX60HkW62MgLlJeym5AC8aL0JKVekmrVx-NGcfJJs7VXVOLbka45ADAlUNqi13TxyEY_oqCZzGatJZK8sFNYMvGFtTcnhjSEoxdl9LjcMAWWgVuKg-iVAX1vAf0HhD7H3XqJKPaZR-o2fQ5kvEKzzfz_VkUeQO4DG-1gpKS_jNVynb1ZxUGbs5y56WmDDw';

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
            provisioning_result: '{\"id\":\"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb\",\"name\":\"sqldb\",\"type\":\"Microsoft.Sql/servers/databases\",\"location\":\"West US\",\"kind\":\"v12.0,user\",\"properties\":{\"databaseId\":\"bf19fd8d-8b08-4b11-aceb-16dafee3c7cc\",\"edition\":\"Basic\",\"status\":\"Online\",\"serviceLevelObjective\":\"Basic\",\"collation\":\"SQL_Latin1_General_CP1_CI_AS\",\"maxSizeBytes\":\"2147483648\",\"creationDate\":\"2016-07-08T08:54:17.73Z\",\"currentServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveName\":null,\"defaultSecondaryLocation\":\"East US\",\"earliestRestoreDate\":\"2016-07-08T09:05:03.543Z\",\"elasticPoolName\":null,\"containmentState\":2},\"sqlServerName\":\"golive4\",\"administratorLogin\":\"greg\",\"administratorLoginPassword\":\"P@ssw0rd!\"}',
            azure: azure
        };

        cb = new cmdbind(log, validParams);
    });

    after(function () {
        sqldbOps.getToken.restore();
        sqldbOps.executeSql.restore();
    });

    describe('', function () {
        sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
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
