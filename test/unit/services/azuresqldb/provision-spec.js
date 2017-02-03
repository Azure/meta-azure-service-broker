/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuresqldb/cmd-provision');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');
var azure = require('../helpers').azure;

var accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSIsImtpZCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuYXp1cmUuY29tLyIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJpYXQiOjE0Njc4MTYyMTcsIm5iZiI6MTQ2NzgxNjIxNywiZXhwIjoxNDY3ODIwMTE3LCJhcHBpZCI6ImQ4MTllODE4LTRkNGEtNGZmOS04OWU5LTliZTBiZmVjOWVjZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0Ny8iLCJvaWQiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJzdWIiOiI2NDgwN2MzMi0xYWYxLTRlNTgtYWMwOS02NGM1NTU0YzdjNTgiLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ2ZXIiOiIxLjAifQ.tqCAMoZz7n3AKBjdNUHwGfLSaDp7Qdl6Dzu_5cf5WNoKCet9E6ohLZtohfiLXuNS-uG-UDRDNtvX_eVayui422CkdDSbAtEPZXIRaFD8dGVO3uMRKWhWQ1u-aTA8LKHKKO2a6aF9hWwjHDQ_FRwi1qZ8UX60HkW62MgLlJeym5AC8aL0JKVekmrVx-NGcfJJs7VXVOLbka45ADAlUNqi13TxyEY_oqCZzGatJZK8sFNYMvGFtTcnhjSEoxdl9LjcMAWWgVuKg-iVAX1vAf0HhD7H3XqJKPaZR-o2fQ5kvEKzzfz_VkUeQO4DG-1gpKS_jNVynb1ZxUGbs5y56WmDDw';

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

describe('SqlDb - Provision - PreConditions', function () {
    var params = {};
    var cp;

    describe('All the required parameters are provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    sqlServerName: 'azureuser',
                    sqlServerParameters: {
                        location: 'westus',
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{'sqldb':{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
        });

        it('should succeed to validate the parameters', function (done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });

    describe('a depreciated parameter "sqlServerCreateIfNotExist" is provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    sqlServerName: 'azureuser',
                    sqlServerCreateIfNotExist: true,
                    sqlServerParameters: {
                        location: 'westus',
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{sql:{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
        });

        it('should fail to validate the parameters', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });

    describe('parameters file is not provided', function () {

        before(function () {
            params = {
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure,
                privilege: {
                    'sqldb': {
                        'isAllowedToCreateSqlServer': true,
                        'isAllowedToConfigureFirewallRules': true
                    }
                },
                accountPool:{sql:{}}
            };
            cp = new cmdProvision(log, params);
        });

        it('should fail to validate the parameters', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution (allow to create server)', function () {
    var params = {};
    var cp;

    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                sqlServerName: 'fake-server-name',
                sqlServerParameters: {
                    allowSqlServerFirewallRules: [{
                        ruleName: 'new rule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    location: 'westus',
                    properties: {
                        administratorLogin: 'azureuser',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                },
                sqldbName: 'fake-db-name',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            privilege: {
                'sqldb': {
                    'allowToCreateSqlServer': true
                }
            },
            accountPool:{'sqldb':{}}
        };

        cp = new cmdProvision(log, params);
        cp.fixupParameters();
    });

    describe('Server & Database that does not previously exist', function() {

        before(function () {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
            sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
            sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.NOT_FOUND });
            sinon.stub(sqldbOps, 'createServer').yields(null, {
                statusCode: HttpStatus.OK,
                body: {
                    properties: {
                        fullyQualifiedDomainName: 'fake-fqdn'
                    }
                }
            });
            sinon.stub(sqldbOps, 'createFirewallRule').yields(null, { statusCode: HttpStatus.OK });
            sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.NOT_FOUND });
            sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        });
    
        after(function () {
            sqldbOps.getToken.restore();
            resourceGroupClient.checkExistence.restore();
            resourceGroupClient.createOrUpdate.restore();
            sqldbOps.getServer.restore();
            sqldbOps.createServer.restore();
            sqldbOps.createFirewallRule.restore();
            sqldbOps.getDatabase.restore();
            sqldbOps.createDatabase.restore();
        });
    
        it('should not callback error', function (done) {
            cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
            sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
            sinon.stub(sqldbOps, 'getServer').yields(null, {
                statusCode: HttpStatus.OK,
                body: '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
            });
            sinon.stub(sqldbOps, 'createFirewallRule').yields(null, { statusCode: HttpStatus.OK });
            sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.NOT_FOUND });
            sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        });
    
        after(function () {
            sqldbOps.getToken.restore();
            resourceGroupClient.checkExistence.restore();
            resourceGroupClient.createOrUpdate.restore();
            sqldbOps.getServer.restore();
            sqldbOps.createFirewallRule.restore();
            sqldbOps.getDatabase.restore();
            sqldbOps.createDatabase.restore();
        });
    
        it('should not callback error', function (done) {
    
            cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
    
        });
    });

});

describe('SqlDb - Provision - Execution (not allow to create server)', function () {
    var params = {};
    var cp;

    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                sqlServerName: 'fake-server-name',
                sqldbName: 'fake-db-name',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            privilege: {
                'sqldb': {
                    'allowToCreateSqlServer': false
                }
            },
            accountPool:{
                'sqldb': {
                    'fake-server-name': {
                        administratorLogin: 'azureuser',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };

        cp = new cmdProvision(log, params);
        cp.fixupParameters();
    });

    describe('Server & Database that does not previously exist', function() {

        before(function () {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        });
    
        after(function () {
            sqldbOps.getToken.restore();
            sqldbOps.getServer.restore();
        });
    
        it('should callback error that server not exist', function (done) {
            cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
                should.exist(err);
                err.message.should.equal('The specified server does not exist but you do not have the privilege to create a new server.');
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
            sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
            sinon.stub(sqldbOps, 'getServer').yields(null, {
                statusCode: HttpStatus.OK,
                body: '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
            });
            sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.NOT_FOUND });
            sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        });
    
        after(function () {
            sqldbOps.getToken.restore();
            sqldbOps.getServer.restore();
            sqldbOps.getDatabase.restore();
            sqldbOps.createDatabase.restore();
        });
    
        it('should not callback error', function (done) {
    
            cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
    
        });
    });

});

describe('SqlDb - Provision - Firewall rules', function () {
    var params = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    sqlServerName: 'azureuser',
                    sqlServerParameters: {
                        allowSqlServerFirewallRules: [{
                            ruleName: 'new rule',
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        location: 'westus',
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'isAllowedToCreateSqlServer': true,
                        'isAllowedToConfigureFirewallRules': true
                    }
                },
                accountPool:{sql:{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
        });

        it('correct firewall rule specs are given', function (done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });

    describe('Incorrect firewall rule specs are given', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    sqlServerName: 'azureuser',
                    sqlServerParameters: {
                        location: 'westus',
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'isAllowedToCreateSqlServer': true,
                        'isAllowedToConfigureFirewallRules': true
                    }
                },
                accountPool:{sql:{}}
            };
        });

        describe('no rule name', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    startIpAddress: '0.0.0.0',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.allValidatorsSucceed()).should.equal(false);
                done();
            });
        });

        describe('no start IP address', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.allValidatorsSucceed()).should.equal(false);
                done();
            });
        });

        describe('no end IP address', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    startIpAddress: '0.0.0.0'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.allValidatorsSucceed()).should.equal(false);
                done();
            });
        });
    });
});
