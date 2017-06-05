/* jshint camelcase: false */

'use strict';

const common = require('../../common');
const Config = require('./service');
const log = common.getLogger(Config.name);
const util = require('util');

const postgresqldbDeprovision = function (params) {

  let provisioningResult = params.provisioning_result;

  log.info(
    util.format(
      'postgresqldb cmd-deprovision: resourceGroup: %s, postgresqldbName: %s, postgresqlServerName: %s',
      provisioningResult.resourceGroup,
      provisioningResult.postgresqldbName,
      provisioningResult.postgresqlServerName
    )
  );

  this.deprovision = function (client) {
    return client.servers.deleteMethod(
      provisioningResult.resourceGroup,
      provisioningResult.postgresqlServerName
    );
  };

};

module.exports = postgresqldbDeprovision;
