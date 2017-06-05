/* jshint camelcase: false */

'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');

const CmdDeprovision = require('../../../../lib/services/azurepostgresqldb/cmd-deprovision');

describe('PostgreSqlDb - deprovision command', function() {

  let params;
  let pmc; // postgresql management client
  let cd;

  beforeEach(function() {
    params = {
      provisioning_result: {
        resourceGroup: 'fake-resource-group-name',
        postgresqlServerName: 'fake-server-name',
        postgresqldbName: 'fake-db-name'
      }
    };
    pmc = {
      servers: {}
    };
    pmc.servers.deleteMethod = sinon.stub();
    cd = new CmdDeprovision(params);
  });

  beforeEach(function() {
    // Resolve
    pmc.servers.deleteMethod.resolves();
  });

  it('should deprovision', function() {
    return cd.deprovision(pmc).should.be.fulfilled()
    .then(() => {
      pmc.servers.deleteMethod.should.be.calledOnce();
    });
  });

});
