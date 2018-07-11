/*
good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdUnbind = require('../../../../lib/services/azuresqldbfailovergroup/cmd-unbind');
var sqldbfgOperations = require('../../../../lib/services/azuresqldbfailovergroup/client');
var azure = require('../helpers').azure;

var sqldbfgOps = new sqldbfgOperations(azure);

describe('SqlDbFailoverGroup - Unbind', function () {

  var cu;

  before(function () {

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

    cu = new cmdUnbind(validParams);
    sinon.stub(sqldbfgOps, 'executeSqls').yields(null);
  });

  after(function () {
    sqldbfgOps.executeSqls.restore();
  });

  describe('', function () {
    it('should not exist error', function (done) {
      cu.unbind(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        done();
      });
    });
  });
});
