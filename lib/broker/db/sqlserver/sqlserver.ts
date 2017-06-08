'use strict';

var sqlDb = require('mssql');

export function executeSql(config: any, sql: any, callback: any, retry: number = 3, retryInterval: number = 1000) {
  var conn = sqlDb.connect(config, function(err: any) {
    if (err) {
      if (retry === 0) {
        return callback(err);
      } else {
        return setTimeout(function(){executeSql(config, sql, callback, retry-1, retryInterval);}, retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.query(sql, function(err: any, recordset: any) {
      conn.close();
      callback(err, recordset);
    });
  });
};

export function executeSqlWithParameters(config: any, sql: any, parameters: any, callback: any, retry: number = 3, retryInterval: number = 1000) {
  var conn = sqlDb.connect(config, function(err: any){
    if (err) {
      if (retry === 0) {
        return callback(err);
      } else {
        return setTimeout(function(){executeSqlWithParameters(config, sql, parameters, callback, retry-1, retryInterval);}, retryInterval);
      }
    }
    var req = new sqlDb.Request(conn);
    req.input('parameters', parameters);
    req.query(sql, function(err: any, recordset: any) {
      conn.close();  
      callback(err, recordset);
    });
  });
};
