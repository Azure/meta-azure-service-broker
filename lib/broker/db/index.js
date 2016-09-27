'use strict';
var Logule = require('logule');
var Sqlserver = require('./sqlserver');

var Database = function(opts) {
  var db = new Sqlserver(opts);

  db.instanceTableName = 'instances';
  db.bindingTableName = 'bindings';
  db.log = Logule.init(module, db.name);
  return db;
};

module.exports = Database;