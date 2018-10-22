/* jshint camelcase: false */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var common = require('../../common');

var sqldbfgUpdate = function (params) {

    this.update = function (next) {
        // The updated instance will be stored in the broker database.
        var updatedInstance = _.extend({}, params.instance);
        updatedInstance['last_operation'] = 'update';

        // Update the old userRoles and userPermissions stored in the broker DB when the server password is changed manually outside of Cloud Foundry
        if (params.requested.parameters && (params.requested.parameters.userRoles || params.requested.parameters.userPermissions)) {
            var newUserRoles = params.requested.parameters.userRoles;
            updatedInstance.parameters.userRoles = newUserRoles;
            var newUserPermissions = params.requested.parameters.userPermissions;
            updatedInstance.parameters.userPermissions = newUserPermissions;

            // This only modifies the broker database so we can exit without the need to poll
            var reply = {
                statusCode: HttpStatus.OK, code: HttpStatus.getStatusText(HttpStatus.OK), value: {
                    state: 'succeeded',
                    description: 'Updated userRoles /  userPermissions.'
                } };
            return next(null, reply, updatedInstance);
        }
    };

    // validators
    this.areUserRolesValid = function () {
        // not existed or valid
        return (!params.requested.parameters || !params.requested.parameters.userRoles) ||
            common.isValidStringArray(params.requested.parameters.userRoles);
    };

    this.areUserPermissionsValid = function () {
        return (!params.requested.parameters || !params.requested.parameters.userPermissions) ||
            common.isValidStringArray(params.requested.parameters.userPermissions);
    };

    this.getInvalidParams = function () {
        var invalidParams = [];
        if (!this.areUserRolesValid()) invalidParams.push('userRoles');
        if (!this.areUserPermissionsValid()) invalidParams.push('UserPermissions');
        return invalidParams;
    };
};

module.exports = sqldbfgUpdate;
