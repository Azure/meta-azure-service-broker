/* jshint camelcase: false */

'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');

const HttpStatus = require('http-status-codes');

const CmdPoll = require('../../../../lib/services/azurepostgresqldb/cmd-poll');

describe('PostgreSqlDb - poll command', function() {

  let params;
  let pmc; // postgresql management client
  let dbc; // database connection factory function
  let pc; // postgresql client
  let cp;

  const errNotFound = new Error();

  before(function() {
    errNotFound.statusCode = HttpStatus.NOT_FOUND;
  });

  beforeEach(function() {
    params = {
      provisioning_result: {
        resourceGroup: 'fake-resource-group-name',
        postgresqlServerName: 'fake-server-name',
        postgresqldbName: 'fake-db-name'
      }
    };

    pmc = {
      servers: {},
      databases: {}
    };
    pmc.servers.get = sinon.stub();
    pmc.databases.get = sinon.stub();

    pc = {};
    pc.query = sinon.stub();
    pc.end = sinon.stub();

    dbc = sinon.stub();
    // Factory function resolves to a fake postgres client
    dbc.resolves(pc);
  });

  describe('polling provisioning status', function() {

    beforeEach(function() {
      params.last_operation = 'provision';
      cp = new CmdPoll(params);
      // Resolve query with a fake (good) result
      pc.query.resolves({
        rows: [ { owner: 'fake-db-name' } ]
      });
    });

    describe('an unspecified error occurs retrieving server', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        pmc.servers.get.rejects(new Error());
      });

      it('should fail', function() {
        return cp.poll(pmc, dbc).should.be.rejected();
      });

    });

    describe('server does not exist', function() {

      beforeEach(function() {
        // Reject with a 404
        pmc.servers.get.rejects(errNotFound);
      });

      it('should determine provisioning is in progress', function() {
        return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
          reply.state.should.equal('in progress');
          reply.description.should.containEql('Creating database');
        });
      });

    });

    describe('server exists', function() {

      beforeEach(function() {
        // Resolve with a fake server
        pmc.servers.get.resolves({});
      });

      describe('an unspecified error occurs retrieving database', function() {

        beforeEach(function() {
          // Reject with an unspecified error
          pmc.databases.get.rejects(new Error());
        });

        it('should fail', function() {
          return cp.poll(pmc, dbc).should.be.rejected();
        });

      });

      describe('database does not exist', function() {

        beforeEach(function() {
          // Reject with a 404
          pmc.databases.get.rejects(errNotFound);
        });

        it('should determine provisioning is in progress', function() {
          return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
            reply.state.should.equal('in progress');
            reply.description.should.containEql('Creating database');
          });
        });

      });

      describe('database exists', function() {

        beforeEach(function() {
          // Resolve with a fake database
          pmc.databases.get.resolves({});
        });

        describe('database has wrong owner', function() {

          beforeEach(function() {
            // Resolve query with a fake (bad) result
            pc.query.resolves({
              rows: [ { owner: 'azureuser' } ]
            });
          });

          it('should determine provisioning is in progress', function() {
            return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
              reply.state.should.equal('in progress');
              reply.description.should.containEql('Creating database');
              pc.query.should.be.calledOnce();
            });
          });

        });

        it('should determine provisioning succeeded', function() {
          return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
            reply.state.should.equal('succeeded');
            reply.description.should.containEql('Created database');
          });
        });

      });

    });

  });

  describe('polling deprovisioning status', function() {

    beforeEach(function() {
      params.last_operation = 'deprovision';
      cp = new CmdPoll(params);
    });

    describe('an unspecified error occurs retrieving server', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        pmc.servers.get.rejects(new Error());
      });

      it('should fail', function() {
        return cp.poll(pmc, dbc).should.be.rejected();
      });

    });

    describe('server exists', function() {

      beforeEach(function() {
        // Resolve with a fake server
        pmc.servers.get.resolves({});
      });

      it('should determine deprovisioning is in progress', function() {
        return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
          reply.state.should.equal('in progress');
          reply.description.should.containEql('Deleting database');
        });
      });

    });

    describe('server does not exist', function() {

      beforeEach(function() {
        // Reject with a 404
        pmc.servers.get.rejects(errNotFound);
      });

      it('should determine deprovisioning succeeded', function() {
        return cp.poll(pmc, dbc).should.be.fulfilled().then((reply) => {
          reply.state.should.equal('succeeded');
          reply.description.should.containEql('Deleted database');
        });
      });

    });

  });

  describe('polling with invalid last operation', function() {

    beforeEach(function() {
      params.last_operation = 'bogus';
      cp = new CmdPoll(params);
    });

    it('should fail', function() {
      return cp.poll(pmc, dbc).should.be.rejected();
    });

  });

});
