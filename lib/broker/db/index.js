'use strict';

var Database = function(opts) {
  if (opts.enabled) {
    var Db = require('./' + opts.type);
    return new Db(opts);
  } else {
    return this;
  }
};

Database.prototype.provision = function(req, reply, next) {
  next();
};

Database.prototype.deprovision = function(req, reply, next) {
  next();
};

Database.prototype.bind = function(req, reply, next) {
  next();
};

Database.prototype.unbind = function(req, reply, next) {
  next();
};

module.exports = Database;
