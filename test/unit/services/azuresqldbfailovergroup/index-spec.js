/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var uuid = require('uuid');
var service = require('../../../../lib/services/azuresqldbfailovergroup/service.json');
var handlers;

var azure = require('../helpers').azure;

var generatedValidInstanceId = uuid.v4();

describe('SqlDbFailoverGroup - Index - Provision', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      azure: azure,
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      accountPool: {
        'sqldb': {
          'fakeservera': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeservera',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          },
          'fakeserverb': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeserverb',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          }
        }
      }
    };

    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/')];
    require('../../../../lib/services/azuresqldbfailovergroup/cmd-provision');
    require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-provision')].exports = function(_) {
      this.provision = function (_, callback) {
        callback(null, {value: 'fake-value', body: 'fake-body'});
      };
      this.getInvalidParams = function () {
        return [];
      };
    };
    handlers = require('../../../../lib/services/azuresqldbfailovergroup/index');
  });

  after(function() {
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-provision')];
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/index')];
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

describe('SqlDbFailoverGroup - Index - Deprovision', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      azure: azure,
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'secondaryResourceGroupName': 'fakerg',
        'fgPollingUrl': 'fake-fgPollingUrl'
      },
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      accountPool: {
        'sqldb': {
          'fakeservera': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeservera',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          },
          'fakeserverb': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeserverb',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          }
        }
      }
    };

    require('../../../../lib/services/azuresqldbfailovergroup/cmd-deprovision');
    require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-deprovision')].exports = function(_) {
      this.deprovision = function (_, callback) {
        callback(null, {value: 'fake-value', body: 'fake-body'});
      };
    };
    handlers = require('../../../../lib/services/azuresqldbfailovergroup/index');
  });

  after(function() {
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-deprovision')];
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/index')];
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

describe('SqlDbFailoverGroup - Index - Poll', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      azure: azure,
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'secondaryResourceGroupName': 'fakerg',
        'fgPollingUrl': 'fake-fgPollingUrl'
      },
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      accountPool: {
        'sqldb': {
          'fakeservera': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeservera',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          },
          'fakeserverb': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeserverb',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          }
        }
      }
    };

    require('../../../../lib/services/azuresqldbfailovergroup/cmd-poll');
    require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-poll')].exports = function(_) {
      this.poll = function (_, callback) {
        callback(null, {value: 'fake-value', body: 'fake-body'});
      };
    };
    handlers = require('../../../../lib/services/azuresqldbfailovergroup/index');
  });

  after(function() {
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-poll')];
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/index')];
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

describe('SqlDbFailoverGroup - Index - Bind', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      azure: azure,
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'primaryFQDN': 'fakeservera.database.windows.net',
        'secondaryResourceGroupName': 'fakerg',
        'secondaryFQDN': 'fakeserverb.database.windows.net',
        'fgPollingUrl': 'fake-fgPollingUrl'
      },
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      accountPool: {
        'sqldb': {
          'fakeservera': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeservera',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          },
          'fakeserverb': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeserverb',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          }
        }
      }
    };
    require('../../../../lib/services/azuresqldbfailovergroup/cmd-bind');
    require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-bind')].exports = function(_) {
      this.bind = function (_, callback) {
        callback(null, {databaseUser: 'fakeuser', databaseUserPassword: 'fakeuserpwd'});
      };
    };
    handlers = require('../../../../lib/services/azuresqldbfailovergroup/index');
  });

  after(function() {
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-bind')];
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/index')];
  });

  describe('Bind operation should succeed', function() {
    it('should not return an error and credentials is complete', function(done) {
      handlers.bind(validParams, function(err, reply, result) {
        should.not.exist(err);
        should.exist(reply);
        var credentialsKeys = [
          'sqldbName',
          'sqlServerName',
          'sqlServerFullyQualifiedDomainName',
          'databaseLogin',
          'databaseLoginPassword',
          'jdbcUrl',
          'jdbcUrlForAuditingEnabled',
          'hostname',
          'port',
          'name',
          'username',
          'password',
          'uri'
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

describe('SqlDbFailoverGroup - Index - Unbind', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      azure: azure,
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'secondaryResourceGroupName': 'fakerg',
        'fgPollingUrl': 'fake-fgPollingUrl'
      },
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      accountPool: {
        'sqldb': {
          'fakeservera': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeservera',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          },
          'fakeserverb': {
            'resourceGroup': 'fakerg',
            'location': 'fakelocation',
            'sqlServerName': 'fakeserverb',
            'administratorLogin': 'fakelogin',
            'administratorLoginPassword': 'fakepwd'
          }
        }
      }
    };
    require('../../../../lib/services/azuresqldbfailovergroup/cmd-unbind');
    require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-unbind')].exports = function(_) {
      this.unbind = function (_, callback) {
        callback(null, {});
      };
    };
    handlers = require('../../../../lib/services/azuresqldbfailovergroup/index');
  });

  after(function() {
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/cmd-unbind')];
    delete require.cache[require.resolve('../../../../lib/services/azuresqldbfailovergroup/index')];
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
