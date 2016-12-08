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
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
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
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should succeed if ...', function () {
        it('all validators succeed', function (done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });
});

describe('SqlDb - Provision - PreConditions', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    location: 'westus',
                    properties: {
                        administratorLogin: 'azureuser'
                    }
                },
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should fail if ...', function () {
        it('administrator password is missing', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - PreConditions testing', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    location: 'westus',
                    properties: {
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
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should fail if ...', function () {
        it('administrator login is missing', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - Invalid PreConditions - missing parameters file', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
    });

    describe('Provision should fail if ...', function () {
        it('parameters file is not provided', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution - server & Database that does not previously exist', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
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
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.getToken.restore();
        sqldbOps.createDatabase.restore();
        sqldbOps.createFirewallRule.restore();
        sqldbOps.getServer.restore();
        sqldbOps.createServer.restore();
        sqldbOps.getDatabase.restore();
    });

    it('should not callback error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        sinon.stub(sqldbOps, 'createServer').yields(null, { statusCode: HttpStatus.OK });
        sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
        sinon.stub(sqldbOps, 'createFirewallRule').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
            should.not.exist(err);
            done();
        });

    });
});

describe('SqlDb - Provision - Execution - server & Database that both previously exist', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
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
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.getToken.restore();
        sqldbOps.createFirewallRule.restore();
        sqldbOps.getServer.restore();
        sqldbOps.getDatabase.restore();
    });

    it('should get a conflict error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        sinon.stub(sqldbOps, 'createServer').yields(null, { statusCode: HttpStatus.OK });
        sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.OK });
        sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
        sinon.stub(sqldbOps, 'createFirewallRule').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
            should.exist(err);
            (err.statusCode).should.equal(409);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution - Basic plan, no sql server parameters, sql server exists', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.getToken.restore();
        sqldbOps.createDatabase.restore();
        sqldbOps.getServer.restore();
    });

    it('should not callback error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
            should.not.exist(err);
            done();
        });

    });
});

describe('SqlDb - Provision - Execution - StandardS0 plan, no sql server parameters, sql server exists', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "2497b7f3-341b-4ac6-82fb-d4a48c005e19",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.getToken.restore();
        sqldbOps.createDatabase.restore();
        sqldbOps.getServer.restore();
    });

    it('should not callback error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        sinon.stub(sqldbOps, 'getToken').yields(null, accessToken);
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
            should.not.exist(err);
            done();
        });

    });
});

describe('SqlDb - Provision - Firewall rules', function () {
    var validParams = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            validParams = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    sqlServerName: 'azureuser',
                    sqlServerCreateIfNotExist: true,
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
                azure: azure
            };
            cp = new cmdProvision(log, validParams);
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
                    sqlServerCreateIfNotExist: true,
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
                azure: azure
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
