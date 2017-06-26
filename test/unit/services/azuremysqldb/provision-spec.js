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
                plan_id: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    mysqlDatabaseName: 'fake-db-name'
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
                plan_id: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('should fail to validate the parameters', function () {
            (cp.getInvalidParams().length).should.equal(6);
            cp.getInvalidParams().should.deepEqual([
                'resourceGroupName',
                'location',
                'mysqlServerName',
                'administratorLogin',
                'administratorLoginPassword',
                'mysqlDatabaseName'
            ]);
        });
    });
});

describe('MySqlDb - Provision - Execution', function () {
    var params = {};
    var cp;
    
    beforeEach(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
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
                },
                mysqlDatabaseName: 'fake-db-name'
            },
            azure: azure
        };

        cp = new cmdProvision(params);
        msRestRequest.HEAD = sinon.stub();
        
        // check resource group existence
        msRestRequest.HEAD.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 404});

        msRestRequest.PUT = sinon.stub();
        
        // create resource group
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 200});
        
        // create server
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
            .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-serverPollingUrl'} }, {properties: {fullyQualifiedDomainName: 'fake-fqdn'}});
    });

    afterEach(function () {
        mockingHelper.restore();
    });
        
    describe('Server that does not previously exist', function() {

        before(function () {
          msRestRequest.GET = sinon.stub();
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
            cp.provision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.resourceGroup.should.equal(params.parameters.resourceGroup);
                result.body.mysqlServerName.should.equal(params.parameters.mysqlServerName);
                result.body.administratorLogin.should.equal(params.parameters.mysqlServerParameters.properties.administratorLogin);
                result.body.administratorLoginPassword.should.equal(params.parameters.mysqlServerParameters.properties.administratorLoginPassword);
                result.body.serverPollingUrl.should.equal('fake-serverPollingUrl');
                result.body.mysqlDatabaseName.should.equal(params.parameters.mysqlDatabaseName);
                done();
            });
        });
    });
    
    describe('Server that does previously exist', function() {

        before(function () {
          msRestRequest.GET = sinon.stub();
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
              .yields(null, {statusCode: 200}, '{}');
        });
    
        it('should callback conflict error', function (done) {
            cp.provision(mysqldbOps, function (err, result) {
                should.exist(err);
                done();
            });
        });
    });

});

describe('MySqlDb - Provision - Firewall rules', function () {
    var params = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
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
                    },
                    mysqlDatabaseName: 'fake-db-name'
                },
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('correct firewall rule specs are given', function (done) {
            (cp.getInvalidParams().length).should.equal(0);
            done();
        });
    });
    
    describe('Incorrect firewall rule specs are given', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    mysqlDatabaseName: 'fake-db-name'
                },
                azure: azure
            };
        });

        describe('no rule name', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    startIpAddress: '0.0.0.0',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });

        describe('no start IP address', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });

        describe('no end IP address', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    startIpAddress: '0.0.0.0'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });
    });
});