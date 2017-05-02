var _ = require('underscore');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var HttpStatus = require('http-status-codes');

var sqldbUpdate = function (params) {

    this.update = function (next) {
        log.info('sqldb cmd-update.update invoked');

        var updatedInstance = _.extend({}, params.instance);

        // Update password
        var newPassword = params.requested.parameters.sqlServerParameters.properties.administratorLoginPassword;
        updatedInstance.parameters.sqlServerParameters.properties.administratorLoginPassword = newPassword;
        updatedInstance['provisioning_result'].administratorLoginPassword = newPassword;

        // If new parameters require changes to the cloud service, call azure api through client.js here

        var reply = { statusCode: HttpStatus.OK, code: HttpStatus.getStatusText(HttpStatus.OK), value: {} };
        return next(null, reply, updatedInstance);
    };
};

module.exports = sqldbUpdate;
