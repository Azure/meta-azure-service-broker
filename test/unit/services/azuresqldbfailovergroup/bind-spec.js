/*
good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
test:
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdbind = require('../../../../lib/services/azuresqldbfailovergroup/cmd-bind');
var sqldbfgOperations = require('../../../../lib/services/azuresqldbfailovergroup/client');
var azure = require('../helpers').azure;

var sqldbfgOps = new sqldbfgOperations(azure);

describe('SqlDbFailoverGroup - bind', function () {

  var cb;

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

    cb = new cmdbind(validParams);
    sinon.stub(sqldbfgOps, 'executeSql').yields(null);
  });

  after(function () {
    sqldbfgOps.executeSql.restore();
  });

  describe('', function () {
    it('should not callback error', function (done) {
      cb.bind(sqldbfgOps, function (err, result) {
        should.not.exist(err);
        should.exist(result.databaseUser);
        should.exist(result.databaseUserPassword);
        done();
      });
    });
  });
});
