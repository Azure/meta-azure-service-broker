/* jshint camelcase: false */

'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');

const CmdUnbind = require('../../../../lib/services/azurepostgresqldb/cmd-unbind');

describe('PostgreSqlDb - unbind command', function() {

  let params;
  let dbc; // database connection factory function
  let pc; // postgresql client
  let cu;

  beforeEach(function() {
    params = {
      provisioning_result: {
        resourceGroup: 'fake-resource-group-name',
        postgresqlServerName: 'fake-server-name',
        postgresqldbName: 'fake-db-name'
      },
      binding_result: {
        databaseLogin: 'fake-db-user'
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
    
    cu = new CmdUnbind(params);
  });

  it('should unbind', function() {
    return cu.unbind(dbc).should.be.fulfilled()
    .then(() => {
      dbc.should.be.calledOnce();
      pc.query.should.have.calledOnce();
      pc.end.should.be.calledOnce();
    });
  });

  describe('error connecting to the database', function() {

    beforeEach(function() {
      // Rejects with an unspecified error
      dbc.rejects(new Error());
    });

    it('should not unbind', function() {
      return cu.unbind(dbc).should.be.rejected()
      .then(() => {
        dbc.should.be.calledOnce();
        pc.query.should.not.be.called();
        pc.end.should.not.be.called();
      });
    });

  });

  describe('unspecified error', function() {

    beforeEach(function() {
      // Rejects with an unspecified error
      pc.query.rejects(new Error());
    });

    it('should not unbind', function() {
      return cu.unbind(dbc).should.be.rejected()
      .then(() => {
        dbc.should.be.calledOnce();
        pc.query.should.be.calledOnce();
        pc.end.should.be.calledOnce();
      });
    });

  });

});
