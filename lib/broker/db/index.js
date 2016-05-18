'use strict';

var Database = function(opts) {
  var Db = require('./sqlserver');
  return new Db(opts);
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
