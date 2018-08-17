/*
good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuresqldbfailovergroup/cmd-provision');
var sqldbfgOperations = require('../../../../lib/services/azuresqldbfailovergroup/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var sqldbfgOps = new sqldbfgOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('SqlDbFailoverGroup - Provision - PreConditions', function () {
  var params = {};
  var cp;

  describe('All the required parameters are provided and related servers are in sqlServerPool', function () {
    before(function () {
      params = {
        instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
        plan_id: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
        parameters: {
          'primaryServerName': 'fakeservera',
          'primaryDbName': 'sqldba',
          'secondaryServerName': 'fakeserverb',
          'failoverGroupName': 'failovergroupa',
          'readWriteEndpoint': {
              'failoverPolicy': 'Automatic',
              'failoverWithDataLossGracePeriodMinutes': 60
          },
          'userRoles': ['db_owner'],
          'userPermissions': ['VIEW ANY COLUMN MASTER KEY DEFINITION']
        },
        azure: azure,
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
      cp = new cmdProvision(params);
    });

    it('should succeed to validate the parameters', function () {
      (cp.getInvalidParams().length).should.equal(0);
    });
  });

  describe('All the required parameters are provided but related servers are not in sqlServerPool', function () {
    before(function () {
      params = {
        instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
        plan_id: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
        parameters: {
          'primaryServerName': 'fakeservera',
          'primaryDbName': 'sqldba',
          'secondaryServerName': 'fakeserverb',
          'failoverGroupName': 'failovergroupa',
          'readWriteEndpoint': {
              'failoverPolicy': 'Automatic',
              'failoverWithDataLossGracePeriodMinutes': 60
          },
          'userRoles': ['db_owner'],
          'userPermissions': ['VIEW ANY COLUMN MASTER KEY DEFINITION']
        },
        azure: azure,
        accountPool: {}
      };
      cp = new cmdProvision(params);
    });

    it('should fail to validate the parameters', function () {
      (cp.getInvalidParams().length).should.equal(2);
      cp.getInvalidParams().should.deepEqual([
        'primaryServerName',
        'secondaryServerName'
      ]);
    });
  });

  describe('parameters file is not provided', function () {

    before(function () {
      params = {
        instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
        plan_id: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
        azure: azure,
        accountPool: {}
      };
      cp = new cmdProvision(params);
    });

    it('should fail to validate the parameters', function () {
      (cp.getInvalidParams().length).should.equal(5);
      cp.getInvalidParams().should.deepEqual([
        'primaryServerName',
        'primaryDbName',
        'secondaryServerName',
        'failoverGroupName',
        'readWriteEndpoint'
      ]);
    });
  });
});

describe('SqlDbFailoverGroup - Provision - Execution - New failover group', function () {
  var params = {};
  var cp;

  beforeEach(function () {
    params = {
      instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
      plan_id: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      azure: azure,
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

    cp = new cmdProvision(params);
    msRestRequest.GET = sinon.stub();
    msRestRequest.PUT = sinon.stub();

    // get primary server
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera')
    .yields(null, {statusCode: 200}, JSON.stringify({properties: {fullyQualifiedDomainName: 'fake-fqdna'}}));
    // get primary db
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/databases/sqldba')
    .yields(null, {statusCode: 200}, '{}');
    // get secondary server
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeserverb')
    .yields(null, {statusCode: 200}, JSON.stringify({properties: {fullyQualifiedDomainName: 'fake-fqdnb'}}));
    // get failover group
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
    .yields(null, {statusCode: 404});
    // create failover group
    msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
    .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-fgPollingUrl'} });
  });

  afterEach(function () {
    mockingHelper.restore();
  });

  describe('Everything is ok', function() {
    it('should not callback error', function (done) {
      cp.provision(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        result.body.primaryResourceGroupName.should.equal(params.accountPool.sqldb.fakeservera.resourceGroup);
        result.body.primaryFQDN.should.equal('fake-fqdna');
        result.body.secondaryResourceGroupName.should.equal(params.accountPool.sqldb.fakeserverb.resourceGroup);
        result.body.secondaryFQDN.should.equal('fake-fqdnb');
        result.body.fgPollingUrl.should.equal('fake-fgPollingUrl');
        done();
      });
    });
  });

  describe('The primary server doesn\'t exist', function() {
    it('should callback error', function (done) {
      msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera')
      .yields(null, {statusCode: 404});
      cp.provision(sqldbfgOps, function (err, result) {
        should.exist(err);
        err.message.should.equal('The primary server does not exist.');
        done();
      });
    });
  });
  describe('The primary db doesn\'t exist', function() {
    it('should callback error', function (done) {
      msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/databases/sqldba')
      .yields(null, {statusCode: 404});
      cp.provision(sqldbfgOps, function (err, result) {
        should.exist(err);
        err.message.should.equal('The primary db does not exist.');
        done();
      });
    });
  });
  describe('The secondary server doesn\'t exist', function() {
    it('should callback error', function (done) {
      msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeserverb')
      .yields(null, {statusCode: 404});
      cp.provision(sqldbfgOps, function (err, result) {
        should.exist(err);
        err.message.should.equal('The secondary server does not exist.');
        done();
      });
    });
  });
  describe('The failover group already exists', function() {
    it('should callback error', function (done) {
      msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
      .yields(null, {statusCode: 200}, '{}');
      cp.provision(sqldbfgOps, function (err, result) {
        should.exist(err);
        err.message.should.equal('The failover group failovergroupa already exists.');
        done();
      });
    });
  });
});

describe('SqlDbFailoverGroup - Provision - Execution - Reigister failover group', function () {
  var params = {};
  var cp;

  beforeEach(function () {
    params = {
      instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
      plan_id: '5a75ffc1-555d-4193-b60b-eb464069f913',
      parameters: {
        'primaryServerName': 'fakeservera',
        'primaryDbName': 'sqldba',
        'secondaryServerName': 'fakeserverb',
        'failoverGroupName': 'failovergroupa'
      },
      azure: azure,
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

    cp = new cmdProvision(params);
    msRestRequest.GET = sinon.stub();
    msRestRequest.PUT = sinon.stub();

    // get primary server
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera')
    .yields(null, {statusCode: 200}, JSON.stringify({properties: {fullyQualifiedDomainName: 'fake-fqdna'}}));
    // get primary db
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/databases/sqldba')
    .yields(null, {statusCode: 200}, '{}');
    // get secondary server
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeserverb')
    .yields(null, {statusCode: 200}, JSON.stringify({properties: {fullyQualifiedDomainName: 'fake-fqdnb'}}));
    // get failover group
    msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
    .yields(null, {statusCode: 200}, JSON.stringify({
      'properties': {
        'partnerServers': [
          {
            'id': '/subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeserverb',
            'location': 'Japan West',
            'replicationRole': 'Secondary'
          }
        ],
        'databases': [
          '/subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/databases/sqldba'
        ]
      }
    }));
  });

  afterEach(function () {
    mockingHelper.restore();
  });

  describe('Everything is ok', function() {
    it('should not callback error', function (done) {
      cp.provision(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        result.body.primaryResourceGroupName.should.equal(params.accountPool.sqldb.fakeservera.resourceGroup);
        result.body.primaryFQDN.should.equal('fake-fqdna');
        result.body.secondaryResourceGroupName.should.equal(params.accountPool.sqldb.fakeserverb.resourceGroup);
        result.body.secondaryFQDN.should.equal('fake-fqdnb');
        done();
      });
    });
  });

  describe('The failover group doesn\'t exists', function() {
    it('should callback error', function (done) {
      msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
      .yields(null, {statusCode: 404});
      cp.provision(sqldbfgOps, function (err, result) {
        should.exist(err);
        err.message.should.equal('The failover group failovergroupa doesn\'t exist.');
        done();
      });
    });
  });
});
