/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var uuid = require('uuid');
var service = require('../../../../lib/services/azuremysqldb/service.json');
var handlers;

var azure = require('../helpers').azure;

var generatedValidInstanceId = uuid.v4();

describe('MySqlDb - Index - Provision', function() {
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
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azuremysqldb/cmd-provision');
        require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-provision')].exports = function(_) {
          this.provision = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
          this.getInvalidParams = function () {
            return [];
          };
        };
        handlers = require('../../../../lib/services/azuremysqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-provision')];
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/index')];
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

describe('MySqlDb - Index - Deprovision', function() {
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
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azuremysqldb/cmd-deprovision');
        require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-deprovision')].exports = function(_) {
          this.deprovision = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
        };
        handlers = require('../../../../lib/services/azuremysqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-deprovision')];
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/index')];
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

describe('MySqlDb - Index - Poll', function() {
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
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };
        
        require('../../../../lib/services/azuremysqldb/cmd-poll');
        require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-poll')].exports = function(_) {
          this.poll = function (_, callback) { 
            callback(null, {value: 'fake-value', body: 'fake-body'});
          };
        };
        handlers = require('../../../../lib/services/azuremysqldb/index');
    });
    
    after(function() {
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/cmd-poll')];
        delete require.cache[require.resolve('../../../../lib/services/azuremysqldb/index')];
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

describe('MySqlDb - Index - Bind', function() {
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
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            provisioning_result: {
              mysqlServerName: 'fake-server-name',
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
                  'mysqlServerName',
                  'mysqlServerFullyQualifiedDomainName',
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

describe('MySqlDb - Index - Unbind', function() {
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
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    properties: {
                        administratorLogin: 'fake-admin-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            provisioning_result: {
              mysqlServerName: 'fake-server-name',
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