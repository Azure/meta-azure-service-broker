'use strict';

var sqlDb = require('mssql');

exports.executeSql = 
function executeSql(config, sql, callback, retry, retryInterval) {
  if (!Number.isInteger(retry)) {
    retry = 3;
  }
  if (!Number.isInteger(retryInterval)) {
    retryInterval = 1000;
  }
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
      if (retry === 0) {
        callback(err, null);
      } else {
          setTimeout(function(){}, retryInterval);
          executeSql(config, sql, callback, retry-1, retryInterval);
      }
    });
};

exports.executeSqlWithParameters = 
function executeSqlWithParameters(config, sql, parameters, callback, retry, retryInterval) {
  if (!Number.isInteger(retry)) {
    retry = 3;
  }
  if (!Number.isInteger(retryInterval)) {
    retryInterval = 1000;
  }
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
      if (retry === 0) {
        callback(err, null);
      } else {
          setTimeout(function(){}, retryInterval);
          executeSqlWithParameters(config, sql, parameters, callback, retry-1, retryInterval);
      }
    });
};
