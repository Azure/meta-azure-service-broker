/* jshint camelcase: false */

'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');

const CmdBind = require('../../../../lib/services/azurepostgresqldb/cmd-bind');

describe('PostgreSqlDb - bind command', function() {

  let params;
  let dbc; // database connection factory function
  let pc; // postgresql client
  let cb;

  beforeEach(function() {
    params = {
      provisioning_result: {
        resourceGroup: 'fake-resource-group-name',
        postgresqlServerName: 'fake-server-name',
        postgresqldbName: 'fake-db-name'
      }
    };

    pc = {};
    pc.query = sinon.stub();
    pc.end = sinon.stub();
    // Resolve query with a fake result
    pc.query.resolves({});

    dbc = sinon.stub();
    // Factory function resolves to a fake postgres client
    dbc.resolves(pc);
    
    cb = new CmdBind(params);
  });

  it('should bind', function() {
    return cb.bind(dbc).should.be.fulfilled()
    .then(() => {
      dbc.should.be.calledOnce();
      pc.query.should.have.callCount(5);
      pc.end.should.be.calledOnce();
    });
  });

  describe('error connecting to the database', function() {

    beforeEach(function() {
      // Rejects with an unspecified error
      dbc.rejects(new Error());
    });

    it('should not bind', function() {
      return cb.bind(dbc).should.be.rejected()
      .then(() => {
        dbc.should.be.calledOnce();
        pc.query.should.not.be.called();
        pc.end.should.not.be.called();
      });
    });

  });

  describe('unspecified error', function() {

    beforeEach(function() {
      // The first call starts the transaction
      pc.query.onCall(0).resolves({});
      // The second call errors
      pc.query.onCall(1).rejects(new Error());
      // The third call rolls the transaction back
      pc.query.onCall(2).resolves({});
    });

    it('should not bind', function() {
      return cb.bind(dbc).should.be.rejected()
      .then(() => {
        dbc.should.be.calledOnce();
        // query function should be called x 3:
        // 0. Start the transaction
        // 1. Bad query
        // 2. Rollback
        pc.query.should.be.calledThrice();
        pc.query.should.be.calledWith('begin');
        pc.query.should.not.be.calledWith('commit');
        pc.query.should.be.calledWith('rollback');
        pc.end.should.be.calledOnce();
      });
    });

  });

});
