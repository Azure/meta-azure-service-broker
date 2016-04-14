'use strict';

var Database = function(opts) {
  if (opts.enabled) {
    var Db = require('./' + opts.type);
    return new Db(opts);
  } else {
    return this;
  }
};

Database.prototype.provision = function(req, reply, callback) {
  callback();
};

Database.prototype.deprovision = function(req, reply, callback) {
  callback();
};

Database.prototype.bind = function(req, reply, callback) {
  callback();
};

Database.prototype.unbind = function(req, reply, callback) {
  callback();
};

module.exports = Database;
