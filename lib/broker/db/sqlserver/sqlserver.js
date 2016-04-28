'use strict';

var sqlDb = require('mssql');

exports.executeSql = function(config, sql, callback) {
  var conn = new sqlDb.Connection(config);
  conn.connect()
    .then(function() {
      var req = new sqlDb.Request(conn);
      req.query(sql)
        .then(function(recordset) {
          callback(null, recordset);
          conn.close();
        })
        .catch(function(err) {
          callback(err, null);
          conn.close();
        });
    })
    .catch(function(err) {
      callback(err, null);
    });
};

exports.executeSqlWithParameters = function(config, sql, parameters, callback) {
  var conn = new sqlDb.Connection(config);
  conn.connect()
    .then(function() {
      var req = new sqlDb.Request(conn);
      req.input('parameters', parameters);
      req.query(sql)
        .then(function(recordset) {
          callback(null, recordset);
          conn.close();
        })
        .catch(function(err) {
          callback(err, null);
          conn.close();
        });
    })
    .catch(function(err) {
      callback(err, null);
    });
};
