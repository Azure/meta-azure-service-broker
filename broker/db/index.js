/*
 * Cloud Foundry Services Connector
 * Copyright (c) 2014 ActiveState Software Inc. All rights reserved.
 */

'use strict';

var Database = function(opts) {

    this.opts = opts || {};

    if (!opts.apiVersion) {
        throw new Error('API version not supplied');
    }

    if (opts.enabled) {
        var Db = require('./v' + opts.apiVersion);
        return new Db(this.opts);
    } else {
        return this;
    }
};

Database.prototype.provision = function (req, reply, next) {
    next();
};

Database.prototype.deprovision = function (req, reply, next) {
    next();
};

Database.prototype.bind = function (req, reply, next) {
    next();
};

Database.prototype.unbind = function (req, reply, next) {
    next();
};

module.exports = Database;
