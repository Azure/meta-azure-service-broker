'use strict';
var Sqlserver = require('./sqlserver');

var Database = function(opts) {
  var db = new Sqlserver(opts);

  db.instanceTableName = 'instances';
  db.bindingTableName = 'bindings';
  return db;
};

module.exports = Database;