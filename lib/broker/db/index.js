'use strict';

var Database = function(opts) {
  var Db = require('./sqlserver');
  return new Db(opts);
};

module.exports = Database;
