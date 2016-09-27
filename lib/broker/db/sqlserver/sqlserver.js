'use strict';

var sqlDb = require('mssql');

exports.executeSql = 
function executeSql(config, sql, callback, retry, retryInterval) {
  if (!(typeof retry === 'number' && (retry%1) === 0)) {
    retry = 3;
  }
  if (!(typeof retryInterval === 'number' && (retryInterval%1) === 0)) {
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
        setTimeout(function(){executeSql(config, sql, callback, retry-1, retryInterval);}, retryInterval);
      }
    });
};

exports.executeSqlWithParameters = 
function executeSqlWithParameters(config, sql, parameters, callback, retry, retryInterval) {
  if (!(typeof retry === 'number' && (retry%1) === 0)) {
    retry = 3;
  }
  if (!(typeof retryInterval === 'number' && (retryInterval%1) === 0)) {
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
      if (retry === 0) {
        callback(err, null);
      } else {
        setTimeout(function(){executeSqlWithParameters(config, sql, parameters, callback, retry-1, retryInterval);}, retryInterval);
      }
    });
};
