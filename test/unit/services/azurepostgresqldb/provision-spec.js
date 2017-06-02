/* jshint camelcase: false */

'use strict';

const sinon = require('sinon');
const should = require('should');
require('should-sinon');

const HttpStatus = require('http-status-codes');

const CmdProvision = require('../../../../lib/services/azurepostgresqldb/cmd-provision');

describe('PostgreSqlDb - provision command', function() {

  const errNotFound = new Error();

  let params;
  let cp;
  let rmc; // resource management client
  let pmc; // postgresql management client
  let dbc; // database connection factory function
  let pc; // postgresql client
  let provisionCallback;

  before(function() {
    errNotFound.statusCode = HttpStatus.NOT_FOUND;
  });

  beforeEach(function() {
    params = {
      parameters: {
        resourceGroup: 'fake-resource-group-name',
        location: 'westus',
        postgresqlServerName: 'fake-server-name',
        postgresqlServerParameters: {
          properties: {
            administratorLogin: 'fake-admin-name',
            administratorLoginPassword: 'c1oudc0w'
          },
          allowPostgresqlServerFirewallRules: [{
            ruleName: 'rule0',
            startIpAddress: '1.1.1.1',
            endIpAddress: '1.1.1.10'
          }]
        },
        postgresqldbName: 'fake-db-name'
      }
    };

    rmc = {
      resourceGroups: {}
    };
    rmc.resourceGroups.get = sinon.stub();
    rmc.resourceGroups.createOrUpdate = sinon.stub();

    pmc = {
      servers: {},
      firewallRules: {},
      databases: {}
    };
    pmc.servers.get = sinon.stub();
    pmc.servers.createOrUpdate = sinon.stub();
    pmc.firewallRules.createOrUpdate = sinon.stub();
    pmc.databases.createOrUpdate = sinon.stub();

    pc = {};
    pc.query = sinon.stub();
    pc.end = sinon.stub();
    // Resolve query with a fake result
    pc.query.resolves({});

    dbc = sinon.stub();
    // Factory function resolves to a fake postgres client
    dbc.resolves(pc);
    
    provisionCallback = sinon.stub();
    
    cp = new CmdProvision(params);
  });

  describe('validation', function() {

    it('should require resourceGroup', function() {
      params.parameters.resourceGroup = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected()
      .then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['resourceGroup']);
      });
    });

    it('should require location', function() {
      params.parameters.location = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected()
      .then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['location']);
      });
    });

    it('should require postgresqlServerName', function() {
      params.parameters.postgresqlServerName = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected()
      .then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['postgresqlServerName']);
      });
    });

    it('should require postgresqldbName', function() {
      params.parameters.postgresqldbName = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected()
      .then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['postgresqldbName']);
      });
    });

    it('should require administratorLogin', function() {
      params.parameters.postgresqlServerParameters.properties.administratorLogin = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected().
      then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['administratorLogin']);
      });
    });

    it('should require administratorLoginPassword', function() {
      params.parameters.postgresqlServerParameters.properties.administratorLoginPassword = null;
      cp = new CmdProvision(params);
      return cp.validate(pmc).should.be.rejected()
      .then((err) => {
        err.isValidationError.should.be.true();
        err.invalidParams.should.deepEqual(['administratorLoginPassword']);
      });
    });

    describe('with firewall rules', function() {

      it('should require a ruleName', function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules[0].ruleName = null;
        cp = new CmdProvision(params);
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          err.invalidParams.should.deepEqual(['allowPostgresqlServerFirewallRules']);
        });
      });

      it('should require a startIpAddress', function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules[0].startIpAddress = null;
        cp = new CmdProvision(params);
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          err.invalidParams.should.deepEqual(['allowPostgresqlServerFirewallRules']);
        });
      });

      it('should require a valid startIpAddress', function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules[0].startIpAddress = '1.1.1';
        cp = new CmdProvision(params);
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          err.invalidParams.should.deepEqual(['allowPostgresqlServerFirewallRules']);
        });
      });

      it('should require an endIpAddress', function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules[0].endIpAddress = null;
        cp = new CmdProvision(params);
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          err.invalidParams.should.deepEqual(['allowPostgresqlServerFirewallRules']);
        });
      });

      it('should require a valid endIpAddress', function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules[0].endIpAddress = '1.1.1';
        cp = new CmdProvision(params);
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          err.invalidParams.should.deepEqual(['allowPostgresqlServerFirewallRules']);
        });
      });

    });

    describe('unspecified error retrieving server', function() {

      beforeEach(function() {
        // Reject retrieval of server by name with unspecified error
        pmc.servers.get.rejects(new Error());
      });

      it('should fail validation', function() {
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          should(err.isValidationError).be.undefined();
          should(err.invalidParams).be.undefined();
        });
      });

    });

    describe('server already exists', function() {

      beforeEach(function() {
        // Resolve retrieval of server by name with a fake server
        pmc.servers.get.resolves({});
      });

      it('should fail validation', function() {
        return cp.validate(pmc).should.be.rejected()
        .then((err) => {
          err.isValidationError.should.be.true();
          should(err.invalidParams).be.undefined();
        });
      });

    });

    describe('server does not exist', function() {

      beforeEach(function() {
        // Reject retrieval of server by name with a 404
        pmc.servers.get.rejects(errNotFound);
      });

      it('should pass validation', function() {
        return cp.validate(pmc).should.be.fulfilled();
      });

    });

  });

  describe('execution', function() {

    beforeEach(function() {
      // Resolve with a fake resource group
      rmc.resourceGroups.get.resolves({});
      // Resolve with a fake server
      pmc.servers.get.resolves({});
    });

    describe('unspecified error retrieving resource group', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        rmc.resourceGroups.get.rejects(new Error());
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.rejected()
        .then((err) => {
          should(err.isValidationError).be.undefined();
          // Verify we failed for the right reason and didn't get farther
          // than we expect
          rmc.resourceGroups.get.should.be.calledOnce();
          provisionCallback.should.not.be.called();
          pmc.servers.createOrUpdate.should.not.be.called();
        });
      });

    });

    describe('resource group does not exist', function() {

      beforeEach(function() {
        // Reject with a 404
        rmc.resourceGroups.get.rejects(errNotFound);
      });

      it('should create the resource group and provisioning should succeed', function() {
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then(() => {
          rmc.resourceGroups.createOrUpdate.should.be.calledOnce();
          provisionCallback.should.be.be.calledOnce();
          pmc.servers.createOrUpdate.should.be.calledOnce();
          pmc.firewallRules.createOrUpdate.should.be.calledOnce();
          pmc.databases.createOrUpdate.should.be.calledOnce();
        });
      });

    });

    describe('unspecified error creating server', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        pmc.servers.createOrUpdate.rejects(new Error());
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          should(err.isValidationError).be.undefined();
          // Verify we failed for the right reason and didn't get farther
          // than we expect
          pmc.servers.createOrUpdate.should.be.calledOnce();
          pmc.servers.get.should.not.be.called();
        });
      });

    });

    describe('unspecified error retrieving server', function() {

      beforeEach(function() {
        // Reject retrieval of server by name with unspecified error
        pmc.servers.get.rejects(new Error());
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          should(err.isValidationError).be.undefined();
          // Verify we failed for the right reason and didn't get farther
          // than we expect
          pmc.servers.get.should.be.calledOnce();
          pmc.firewallRules.createOrUpdate.should.not.be.called();
        });
      });

    });

    describe('no firewall rules specified', function() {

      beforeEach(function() {
        delete params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules;
        cp = new CmdProvision(params);
      });

      it('should not create any firewall rules and provisioning should succeed', function() {
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then(() => {
          rmc.resourceGroups.createOrUpdate.should.not.be.called();
          provisionCallback.should.be.be.calledOnce();
          pmc.servers.createOrUpdate.should.be.calledOnce();
          pmc.firewallRules.createOrUpdate.should.not.be.called();
          pmc.databases.createOrUpdate.should.be.calledOnce();
        });
      });

    });

    describe('multiple firewall rules', function() {

      beforeEach(function() {
        params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules.push({
          ruleName: 'rule1',
          startIpAddress: '2.2.2.2',
          endIpAddress: '2.2.2.10'
        });
        cp = new CmdProvision(params);
      });

      it('should create multiple firewall rules and provisioning should succeed', function() {
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then(() => {
          rmc.resourceGroups.createOrUpdate.should.not.be.called();
          provisionCallback.should.be.be.calledOnce();
          pmc.servers.createOrUpdate.should.be.calledOnce();
          pmc.firewallRules.createOrUpdate.should.be.calledTwice();
          pmc.databases.createOrUpdate.should.be.calledOnce();
        });
      });

    });

    describe('unspecified error creating firewall rules', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        pmc.firewallRules.createOrUpdate.rejects(new Error());
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          should(err.isValidationError).be.undefined();
          // Verify we failed for the right reason and didn't get farther
          // than we expect
          pmc.firewallRules.createOrUpdate.should.be.calledOnce();
          pmc.databases.createOrUpdate.should.not.be.called();
        });
      });

    });

    describe('unspecified error creating database', function() {

      beforeEach(function() {
        // Reject with an unspecified error
        pmc.databases.createOrUpdate.rejects(new Error());
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          should(err.isValidationError).be.undefined();
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          // Verify we failed for the right reason and didn't get farther
          // than we expect
          pmc.databases.createOrUpdate.should.be.calledOnce();
          pc.query.should.not.be.called();
        });
      });

    });

    describe('error connecting to the database', function() {

      beforeEach(function() {
        // Rejects with an unspecified error
        dbc.rejects(new Error());
      });

      it('should fail provisioning', function() {
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          should(err.isValidationError).be.undefined();
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          dbc.should.be.calledOnce();
          pc.query.should.not.be.called();
          pc.end.should.not.be.called();
        });
      });

    });

    describe('unspecified error managing database', function() {

      beforeEach(function() {
        // The first call starts the transaction
        pc.query.onCall(0).resolves({});
        // The second call errors
        pc.query.onCall(1).rejects(new Error());
        // The third call rolls the transaction back
        pc.query.onCall(2).resolves({});
      });

      it('should fail provisioning', function() {
        // This will be fulfilled because after we send a response to the client
        // we log and eat errors
        return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
        .then((err) => {
          should(err.isValidationError).be.undefined();
          // Even though the promise wasn't rejected, we'll at least expect it
          // to resolve to an Error in this case
          err.should.be.instanceOf(Error);
          // query function should be called x 3:
          // 0. Start the transaction
          // 1. Bad query
          // 2. Rollback
          pc.query.should.be.calledThrice();
        });
      });

    });

    // This is for the completely average case-- resource group exists, one
    // firewall rule, and no errors
    it('should provision', function() {
      return cp.provision(pmc, rmc, dbc, provisionCallback).should.be.fulfilled()
      .then(() => {
        rmc.resourceGroups.createOrUpdate.should.not.be.called();
        provisionCallback.should.be.be.calledOnce();
        pmc.servers.createOrUpdate.should.be.calledOnce();
        pmc.servers.get.should.be.calledOnce();
        pmc.firewallRules.createOrUpdate.should.be.calledOnce();
        pmc.databases.createOrUpdate.should.be.calledOnce();
        pc.query.should.have.callCount(5);
      });
    });

  });

});
