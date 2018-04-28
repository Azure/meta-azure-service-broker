/*
good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azuresqldbfailovergroup/cmd-deprovision');
var sqldbfgOperations = require('../../../../lib/services/azuresqldbfailovergroup/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var sqldbfgOps = new sqldbfgOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('SqlDbFailoverGroup - Deprovision - Execution - New failover group', function () {
  var params = {};
  var cd;

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
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'secondaryResourceGroupName': 'fakerg'
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

    cd = new cmdDeprovision(params);
    msRestRequest.DELETE = sinon.stub();

    // delete failover group
    msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
    .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-fgPollingUrl'} });
  });

  afterEach(function () {
    mockingHelper.restore();
  });

  describe('Everything is ok', function() {
    it('should not callback error', function (done) {
      cd.deprovision(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        result.body.fgPollingUrl.should.equal('fake-fgPollingUrl');
        done();
      });
    });
  });

  describe('Failover group is not existed', function() {
    it('should still not callback error', function (done) {
      msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeservera/failoverGroups/failovergroupa')
      .yields(null, {statusCode: 204});
      cd.deprovision(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        result.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});

describe('SqlDbFailoverGroup - Deprovision - Execution - Reigistered failover group', function () {
  var params = {};
  var cd;

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
      provisioning_result: {
        'primaryResourceGroupName': 'fakerg',
        'secondaryResourceGroupName': 'fakerg'
      },
      azure: azure,
      accountPool: {
        'sqldb': {
          'sqlservera': {
            'fakeservera': 'fakerg',
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

    cd = new cmdDeprovision(params);
  });

  afterEach(function () {
    mockingHelper.restore();
  });

  describe('Everything is ok', function() {
    it('should not callback error', function (done) {
      cd.deprovision(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        result.value.state.should.equal('succeeded');
        done();
      });
    });
  });
});
