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
  var conn = sqlDb.connect(config, function(err) {
    if (err) {
      if (retry === 0) {
        return callback(err);
      } else {
        return setTimeout(function(){executeSql(config, sql, callback, retry-1, retryInterval);}, retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.query(sql, function(err, recordset) {
      conn.close();
      callback(err, recordset);
    });
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
  var conn = sqlDb.connect(config, function(err){
    if (err) {
      if (retry === 0) {
        return callback(err);
      } else {
        return setTimeout(function(){executeSqlWithParameters(config, sql, parameters, callback, retry-1, retryInterval);}, retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.input('parameters', parameters);
    req.query(sql, function(err, recordset) {
      conn.close();  
      callback(err, recordset);
    });
  });
};
