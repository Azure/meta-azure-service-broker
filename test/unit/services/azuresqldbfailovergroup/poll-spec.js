/*
good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuresqldbfailovergroup/cmd-poll');
var sqldbfgOperations = require('../../../../lib/services/azuresqldbfailovergroup/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

var validParams = {
  instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
  plan_id: '437c321c-6b21-4fef-b84b-0a1fd9ba6991',
  parameters: {
    'primaryServerName': 'fakeservera',
    'primaryDbName': 'sqldba',
    'secondaryServerName': 'fakeserverb',
    'failoverGroupName': 'failovergroupa'
  },
  last_operation: 'provision',
  provisioning_result: {
    'primaryResourceGroupName': 'fakerg',
    'secondaryResourceGroupName': 'fakerg',
    'fgPollingUrl': 'fake-fgPollingUrl'
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

var sqldbfgOps = new sqldbfgOperations(azure);

describe('SqlDbFailoverGroup - Poll - polling failover group immediately after creation is started', function () {

  var cp;

  before(function () {
    cp = new cmdPoll(validParams);
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('fake-fgPollingUrl')
    .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"InProgress","startTime":"2017-04-19T05:39:13.033Z"}');
  });

  after(function () {
    mockingHelper.restore();
  });

  it('should return \'in progress\'', function (done) {
    cp.poll(sqldbfgOps, function (err, result) {
      should.not.exist(err);
      result.body.primaryResourceGroupName.should.equal('fakerg');
      result.body.secondaryResourceGroupName.should.equal('fakerg');
      result.body.fgPollingUrl.should.equal('fake-fgPollingUrl');

      result.value.state.should.equal('in progress');
      result.value.description.should.equal('Creating failover group failovergroupa.');
      done();
    });
  });
});


describe('SqlDbFailoverGroup - Poll - polling failover group after creation is complete', function () {

  before(function () {
    msRestRequest.GET = sinon.stub();
    msRestRequest.GET.withArgs('fake-fgPollingUrl')
    .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"Succeeded","startTime":"2017-04-19T05:39:13.033Z"}');
  });

  after(function () {
    mockingHelper.restore();
  });

  it('should return \'succeeded\'', function (done) {
    var cp = new cmdPoll(validParams);
    cp.poll(sqldbfgOps, function (err, result) {
      should.not.exist(err);
      result.body.primaryResourceGroupName.should.equal('fakerg');
      result.body.secondaryResourceGroupName.should.equal('fakerg');
      should.not.exist(result.body.fgPollingUrl);

      result.value.state.should.equal('succeeded');
      result.value.description.should.equal('Created failover group failovergroupa.');
      done();
    });
  });
});

describe('SqlDbFailoverGroup - Poll - polling failover group after de-provision is complete and the secondary db is successfully deleted', function () {
  var cp;

  before(function () {
    validParams.last_operation = 'deprovision';
    validParams.provisioning_result.fgPollingUrl = 'fake-fgPollingUrl';
    cp = new cmdPoll(validParams);
    msRestRequest.GET = sinon.stub();
    msRestRequest.DELETE = sinon.stub();
    msRestRequest.GET.withArgs('fake-fgPollingUrl')
    .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"Succeeded","startTime":"2017-04-19T05:39:13.033Z"}');
    msRestRequest.DELETE.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fakerg/providers/Microsoft.Sql/servers/fakeserverb/databases/sqldba')
    .yields(null, {statusCode: 200});
  });

  after(function () {
    mockingHelper.restore();
  });

  it('should return success', function (done) {
    cp.poll(sqldbfgOps, function (err, result) {
      should.not.exist(err);
      result.value.state.should.equal('succeeded');
      result.value.description.should.equal('Deleted failover group failovergroupa. Deleted the secondary database sqldba.');
      done();
    });
  });
});
