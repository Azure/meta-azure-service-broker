/*
 * Cloud Foundry Services Connector
 * Copyright (c) 2014 ActiveState Software Inc. All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

'use strict';

var Async = require('async');
var LevelUp = require('level');
var Encryptor = require('../../../common/encryptor.js');

var Database = function (opts) {

    this.opts = opts || {};
    this.db = new LevelUp(opts.databaseFile);
    this.sep = '::';
    this.ns = '__CFSC' + this.sep;
    return this;
};

/**
 * Store the service instance ID and broker reply
 *
 * @param {Object} req - the restify request object
 * @param {Object} key - the broker implementor reply.
 * @callback {Function} next - (err)
 */
Database.prototype.storeInstance = function (req, reply, next) {
    var db = this;
    var instanceID = req.params.id;

    Async.waterfall([
        function (done) {
            db.getAllInstances(done);
        },
        function (instances, done) {
            if (instances.indexOf(instanceID) < 0) {
                instances.push(instanceID);
            }
            done(null, instances);
        },
        function (instances, done) {
            db.db.put(db.ns + 'instances', JSON.stringify(instances), done);
        },
        function (done) {
            db.db.put(db.ns + 'instances' + db.sep + instanceID, JSON.stringify(reply), done);
        }
    ], next);
};

/**
 * Deletes the service instance and associated objects
 *
 * @param {String} instanceID - the service instance ID supplied by the CC.
 * @callback {Function} next - (err)
 */
Database.prototype.deleteInstance = function (instanceID, next) {
    var db = this;
    Async.waterfall([
        function (done) {
            db.getAllBindingsForInstance(instanceID, done);
        },
        function (bindings, done) {
            if (bindings && db.opts.allowOrphanBindings) {
                Async.each(bindings, function (binding, callback) {
                    db.deleteBinding(instanceID, binding, callback);
                }, done);
            } else if (bindings && bindings.length > 0) {
                done(new Error('This service cannot be deleted, ' + bindings.length + ' bindings exist.'));
            } else {
                done();
            }
        },
        function (done) {
            db.getAllInstances(done);
        },
        function (instances, done) {
            if (instances.indexOf(instanceID) >= 0) {
                instances.splice(instances.indexOf(instanceID), 1);
            }
            done(null, instances);
        },
        function (instances, done) {
            db.db.put(db.ns + 'instances', JSON.stringify(instances), done);
        },
        function (done) {
            db.db.del(db.ns + 'instances' + db.sep + instanceID, done);
        }
    ], next);
};

/**
 * Returns an array of all the provisioned service instance ID's
 *
 * @callback {Function} next - (err, instances)
 */
Database.prototype.getAllInstances = function (next) {
    var db = this;
    db.db.get(db.ns + 'instances', function (err, instances) {
        if ((err && err.notFound) || !instances) {
            instances = [];
        } else {
            instances = JSON.parse(instances);
        }
        next(null, instances);
    });
};

/**
 * Returns an array of all the provisioned service binding ID's
 *
 * @param {String} instanceID - the service instance ID
 * @callback {Function} next - (err, bindings)
 */
Database.prototype.getAllBindingsForInstance = function (instanceID, next) {
    var db = this;
    db.db.get(db.ns + 'instances' + db.sep + instanceID + db.sep + 'bindings', function (err, bindings) {
        if ((err && err.notFound) || !bindings) {
            bindings = [];
        } else {
            bindings = JSON.parse(bindings);
        }
        next(null, bindings);
    });
};

/**
 * Stores the binding and broker reply/credentials with the associated
 * instance
 *
 * @param {String} instanceID - the service instance ID
 * @param {String} bindingID - the binding ID
 * @param {Object} reply - the broker implementor reply
 * @callback {Function} next - (err)
 */
Database.prototype.storeBinding = function (instanceID, bindingID, reply, next) {
    var db = this;

    /* Ensure credentials are encrypted */
    reply = Encryptor.encrypt(JSON.stringify(reply), db.opts.encryptionKey);

    Async.waterfall([
        function (done) {
            db.getAllBindingsForInstance(instanceID, done);
        },
        function (bindings, done) {
            if (bindings.indexOf(bindingID) < 0) {
                bindings.push(bindingID);
            }
            done(null, bindings);
        },
        function (bindings, done) {
            db.db.put(db.ns + 'instances' + db.sep + instanceID + db.sep + 'bindings', JSON.stringify(bindings), done);
        },
        function (done) {
            db.db.put(db.ns + 'instances' + db.sep + instanceID + db.sep + 'binding' + bindingID, reply, done);
        }
    ], next);
};

/**
 * Deletes a binding against a provisioned service instance.
 *
 * @param {String} instanceID - the service instance ID
 * @param {String} bindingID - the binding ID
 * @callback {Function} next - (err)
 */
Database.prototype.deleteBinding = function (instanceID, bindingID, next) {
    var db = this;
    Async.waterfall([
        function (done) {
            db.getAllBindingsForInstance(instanceID, done);
        },
        function (bindings, done) {
            if (bindings.indexOf(bindingID) >= 0) {
                bindings.splice(bindings.indexOf(bindingID), 1);
            }
            done(null, bindings);
        },
        function (bindings, done) {
            db.db.put(db.ns + 'instances' + db.sep + instanceID + db.sep + 'bindings', JSON.stringify(bindings), done);
        },
        function (done) {
            db.db.del(db.ns + 'instances' + db.sep + instanceID + db.sep + 'binding' + bindingID, done);
        }
    ], next);
};

/**
 * DB API - provision
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.provision = function (req, reply, next) {
    this.storeInstance(req, reply, next);
};

/**
 * DB API - deprovision
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.deprovision = function (req, reply, next) {
    this.deleteInstance(req.params.id, next);
};

/**
 * DB API - bind
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.bind = function (req, reply, next) {
    this.storeBinding(req.params.instance_id, req.params.id, reply, next);
};

/**
 * DB API - unbind
 *
 * @param {Object} req - the restify request object
 * @param {Object} reply - the broker reply
 * @callback {Function} next - (err)
 */
Database.prototype.unbind = function (req, reply, next) {
    this.deleteBinding(req.params.instance_id, req.params.id, reply, next);
};

module.exports = Database;
