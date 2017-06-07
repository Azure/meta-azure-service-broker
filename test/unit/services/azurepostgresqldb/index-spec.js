/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var uuid = require('uuid');
var service = require('../../../../lib/services/azurepostgresqldb/service.json');
var handlers;

var azure = require('../helpers').azure;

var generatedValidInstanceId = uuid.v4();

describe('PostgreSqlDb - Index - Provision', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            parameters: {
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azurepostgresqldb/cmd-provision');
        require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-provision')].exports = function(_) {
          this.provision = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
          this.getInvalidParams = function () {
            return [];
          };
        };
        handlers = require('../../../../lib/services/azurepostgresqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-provision')];
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/index')];
    });
    
    describe('Provision operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.provision(validParams, function(err, reply, result) {
                should.not.exist(err);
                should.exist(reply);
                should.exist(result);
                done();
            });
                        
        });
    });
});

describe('PostgreSqlDb - Index - Deprovision', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            parameters: {
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azurepostgresqldb/cmd-deprovision');
        require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-deprovision')].exports = function(_) {
          this.deprovision = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
        };
        handlers = require('../../../../lib/services/azurepostgresqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-deprovision')];
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/index')];
    });
    
    describe('Deprovision operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.deprovision(validParams, function(err, reply, result) {
                should.not.exist(err);
                should.exist(reply);
                should.exist(result);
                done();
            });
                        
        });
    });
});

describe('PostgreSqlDb - Index - Poll', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            last_operation: 'provision',
            azure: azure,
            parameters: {
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azurepostgresqldb/cmd-poll');
        require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-poll')].exports = function(_) {
          this.poll = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
        };
        handlers = require('../../../../lib/services/azurepostgresqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/cmd-poll')];
        delete require.cache[require.resolve('../../../../lib/services/azurepostgresqldb/index')];
    });
    
    describe('Poll operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.poll(validParams, function(err, lastOperation, reply, result) {
                should.not.exist(err);
                should.exist(lastOperation);
                should.exist(reply);
                should.exist(result);
                done();
            });
                        
        });
    });
});

describe('PostgreSqlDb - Index - Bind', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            parameters: {
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            provisioning_result: {
              postgresqlServerName: 'fake-server-name',
              fullyQualifiedDomainName: 'fake-fqdn',
              administratorLogin: 'fake-admin-login',
              administratorLoginPassword: 'fake-admin-login-pwd'
            }
        };
        
    });
    
    describe('Bind operation should succeed', function() {        
        it('should not return an error and credentials is complete', function(done) {
            handlers.bind(validParams, function(err, reply, result) {
                should.not.exist(err);
                should.exist(reply);
                var credentialsKeys = [
                  'postgresqlServerName',
                  'postgresqlServerFullyQualifiedDomainName',
                  'administratorLogin',
                  'administratorLoginPassword',
                  'jdbcUrl'
                ];
                credentialsKeys.forEach(function(key){
                  reply.value.credentials.should.have.property(key);
                });
                
                should.exist(result);
                done();
            });
                        
        });
    });
});

describe('PostgreSqlDb - Index - Unbind', function() {
    var validParams;
    
    before(function() {
        validParams = {
            instance_id: generatedValidInstanceId,
            service_id: service.id,
            plan_id: service.plans[0].id,
            azure: azure,
            parameters: {
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            provisioning_result: {
              postgresqlServerName: 'fake-server-name',
              fullyQualifiedDomainName: 'fake-fqdn',
              administratorLogin: 'fake-admin-login',
              administratorLoginPassword: 'fake-admin-login-pwd'
            }
        };
        
    });
    
    describe('Unbind operation should succeed', function() {        
        it('should not return an error', function(done) {
            handlers.unbind(validParams, function(err, reply, result) {
                should.not.exist(err);
                should.exist(reply);
                should.exist(result);
                done();
            });
                        
        });
    });
});